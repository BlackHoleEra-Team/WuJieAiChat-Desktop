/**
 * Copyright (C) 2026 BlackHoleEra-Team All Rights Reserved
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use of this software is strictly prohibited.
 */

// DeepSeek API调用模块 - 与 OpenAI 兼容的 API 格式
class DeepSeekAPI {
  constructor(apiKey) {
    this.apiKey = apiKey
    this.baseURL = 'https://api.deepseek.com'
  }

  // 普通聊天调用
  async chatCompletion(contactConfig, messages, onMessage = null) {
    const {
      model = 'deepseek-chat',
      systemPrompt = '',
      isRolePlay = false
    } = contactConfig

    // 构建请求体
    const requestBody = {
      model: model,
      messages: [],
      stream: !isRolePlay // 角色扮演时禁用流式传输
    }

    // 添加系统提示
    if (systemPrompt) {
      requestBody.messages.push({
        role: 'system',
        content: systemPrompt
      })
    }

    // 添加用户消息
    requestBody.messages.push(...messages)

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`)
      }

      // 如果是流式传输，需要特殊处理SSE格式
      if (requestBody.stream) {
        return await this._handleStreamResponse(response, onMessage)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('DeepSeek API调用失败:', error)
      throw error
    }
  }

  // 处理流式响应
  async _handleStreamResponse(response, onMessage = null) {
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullContent = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        
        // 按行处理SSE数据
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // 保留未完成的行
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6) // 去掉 "data: " 前缀
            
            if (dataStr === '[DONE]') {
              break
            }
            
            try {
              const data = JSON.parse(dataStr)
              if (data.choices && data.choices.length > 0) {
                const choice = data.choices[0]
                if (choice.delta && choice.delta.content) {
                  fullContent += choice.delta.content
                  // 实时调用回调函数更新UI
                  if (onMessage) {
                    onMessage(fullContent)
                  }
                }
              }
            } catch (e) {
              console.warn('解析SSE数据失败:', e, '原始数据:', dataStr)
            }
          }
        }
      }
      
      // 返回完整的回复内容
      return {
        choices: [{
          message: {
            content: fullContent
          }
        }]
      }
    } finally {
      reader.releaseLock()
    }
  }

  // 深度思考调用（deepseek-reasoner）
  async chatCompletionWithThinking(contactConfig, messages, onMessage, onThinking, onComplete) {
    const {
      model = 'deepseek-reasoner',
      systemPrompt = ''
    } = contactConfig

    // 判断是否使用流式传输
    const isStreaming = !!(onMessage || onThinking || onComplete)

    // 构建请求体
    const requestBody = {
      model: model,
      messages: [],
      stream: isStreaming
    }

    // 添加系统提示
    if (systemPrompt) {
      requestBody.messages.push({
        role: 'system',
        content: systemPrompt
      })
    }

    // 添加用户消息
    requestBody.messages.push(...messages)

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`)
      }

      if (isStreaming) {
        // 流式传输处理
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          
          if (done) break
          
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.trim() === '') continue
            
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6)
              
              if (dataStr === '[DONE]') {
                if (onComplete) onComplete()
                return
              }

              try {
                const data = JSON.parse(dataStr)
                
                if (data.choices && data.choices.length > 0) {
                  const choice = data.choices[0]
                  
                  // DeepSeek reasoner 的思考内容在 reasoning_content 字段
                  if (choice.delta && choice.delta.reasoning_content) {
                    console.log('收到深度思考内容:', choice.delta.reasoning_content)
                    if (onThinking) onThinking(choice.delta.reasoning_content)
                  }
                  
                  // 处理正常回复内容
                  if (choice.delta && choice.delta.content) {
                    console.log('收到正常回复内容:', choice.delta.content)
                    if (onMessage) onMessage(choice.delta.content)
                  }
                  
                  // 处理完成状态
                  if (choice.finish_reason) {
                    if (onComplete) onComplete()
                    return
                  }
                }
                
                // 处理使用量统计
                if (data.usage && onComplete) {
                  onComplete(data.usage)
                }
              } catch (error) {
                console.error('解析流式数据失败:', error)
              }
            }
          }
        }
      } else {
        // 非流式传输处理
        const result = await response.json()
        console.log('非流式深度思考响应:', result)
        return result
      }
    } catch (error) {
      console.error('DeepSeek 深度思考API调用失败:', error)
      throw error
    }
  }
}

// 全局变量（用于浏览器环境）
if (typeof window !== 'undefined') {
  window.DeepSeekAPI = DeepSeekAPI
}

// 模块导出（用于Node.js环境）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DeepSeekAPI }
}
