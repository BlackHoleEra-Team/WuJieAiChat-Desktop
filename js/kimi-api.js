/**
 * Copyright (C) 2026 BlackHoleEra-Team All Rights Reserved
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use of this software is strictly prohibited.
 */

// Kimi API调用模块 - 与 OpenAI 兼容的 API 格式
class KimiAPI {
  constructor(apiKey) {
    this.apiKey = apiKey
    this.baseURL = 'https://api.moonshot.cn/v1'
  }

  // 普通聊天调用
  async chatCompletion(contactConfig, messages, onMessage = null) {
    const {
      model = 'kimi-k2.5',
      systemPrompt = '',
      isRolePlay = false,
      deepthink = false
    } = contactConfig

    // 构建请求体
    const requestBody = {
      model: model,
      messages: [],
      stream: !isRolePlay // 角色扮演时禁用流式传输
    }

    // Kimi K2.5 支持通过 thinking 参数控制深度思考
    if (model === 'kimi-k2.5') {
      requestBody.thinking = {
        type: deepthink ? 'enabled' : 'disabled'
      }
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
      console.error('Kimi API调用失败:', error)
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

  // 深度思考调用（kimi-k2-thinking 系列）
  async chatCompletionWithThinking(contactConfig, messages, onMessage, onThinking, onComplete) {
    const {
      model = 'kimi-k2-thinking',
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
                  
                  // Kimi thinking 模型的思考内容在 reasoning_content 字段
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
      console.error('Kimi 深度思考API调用失败:', error)
      throw error
    }
  }

  // 联网搜索调用 - 使用 builtin_function.$web_search
  async chatCompletionWithSearch(contactConfig, messages, onMessage = null, onThinking = null, onComplete = null) {
    const {
      model = 'kimi-k2.5',
      systemPrompt = '',
      deepthink = false
    } = contactConfig

    // 构建请求体（非流式，因为需要处理 tool_calls）
    const requestBody = {
      model: model,
      messages: [],
      stream: false,
      tools: [
        {
          type: 'builtin_function',
          function: {
            name: '$web_search'
          }
        }
      ]
    }

    // 使用联网搜索时必须禁用思考能力
    if (model === 'kimi-k2.5') {
      requestBody.thinking = { type: 'disabled' }
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
      let fullContent = ''
      let searchNotificationSent = false

      // 循环处理，直到没有 tool_calls
      while (true) {
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

        const data = await response.json()
        const choice = data.choices[0]

        // 检查是否有 tool_calls
        if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls) {
          const toolCalls = choice.message.tool_calls

          // 通知正在进行网络搜索（仅在流式模式下，且只通知一次）
          if (onMessage && !searchNotificationSent) {
            onMessage('正在进行网络搜索...')
            searchNotificationSent = true
          }

          // 将 assistant 消息添加到上下文
          requestBody.messages.push({
            role: 'assistant',
            content: choice.message.content || '',
            tool_calls: choice.message.tool_calls
          })

          // 处理每个 tool_call
          for (const toolCall of toolCalls) {
            if (toolCall.function.name === '$web_search') {
              // 对于 $web_search，直接返回参数即可，由 Kimi 内部执行搜索
              const toolResult = toolCall.function.arguments

              // 将 tool 结果添加到上下文
              requestBody.messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                name: toolCall.function.name,
                content: toolResult
              })
            }
          }

          // 继续循环，让模型基于搜索结果生成回复
          continue
        }

        // 正常回复
        if (choice.message && choice.message.content) {
          fullContent = choice.message.content
          // 模拟流式输出，逐步调用回调
          if (onMessage) {
            // 按字符逐步输出，模拟打字效果
            let currentContent = ''
            const chars = fullContent.split('')
            for (let i = 0; i < chars.length; i++) {
              currentContent += chars[i]
              onMessage(currentContent)
              // 小延迟模拟打字效果
              await new Promise(resolve => setTimeout(resolve, 5))
            }
          }
        }

        break
      }

      // 完成回调（只在最后调用一次）
      if (onComplete) {
        onComplete()
      }

      return {
        choices: [{
          message: {
            content: fullContent
          }
        }]
      }
    } catch (error) {
      console.error('Kimi 联网搜索API调用失败:', error)
      throw error
    }
  }

  // 同时支持深度思考和联网搜索（Kimi 不支持同时开启，优先使用联网搜索）
  async chatCompletionWithThinkingAndSearch(contactConfig, messages, onMessage, onThinking, onComplete) {
    // Kimi 不支持同时开启深度思考和联网搜索
    // 如果同时开启，优先使用联网搜索（因为联网搜索会禁用思考）
    console.log('Kimi 不支持同时开启深度思考和联网搜索，优先使用联网搜索')
    return await this.chatCompletionWithSearch(contactConfig, messages, onMessage, onThinking, onComplete)
  }
}

// 全局变量（用于浏览器环境）
if (typeof window !== 'undefined') {
  window.KimiAPI = KimiAPI
}

// 模块导出（用于Node.js环境）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { KimiAPI }
}
