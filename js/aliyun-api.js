// 阿里云API调用模块
class AliyunAPI {
  constructor(apiKey) {
    this.apiKey = apiKey
    this.baseURL = 'https://dashscope.aliyuncs.com'
  }

  // 普通聊天调用
  async chatCompletion(contactConfig, messages, onMessage = null) {
    const {
      model = 'qwen-plus',
      enableSearch = false,
      enableThinking = false,
      systemPrompt = '',
      isRolePlay = false
    } = contactConfig

    // 构建请求体 - 使用兼容模式格式
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
      const response = await fetch(`${this.baseURL}/compatible-mode/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // 如果是流式传输，需要特殊处理SSE格式
      if (requestBody.stream) {
        return await this._handleStreamResponse(response, onMessage)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('阿里云API调用失败:', error)
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

  // 深度思考调用（支持流式和非流式）
  async chatCompletionWithThinking(contactConfig, messages, onMessage, onThinking, onComplete) {
    const {
      model = 'qwen-plus',
      systemPrompt = ''
    } = contactConfig

    // 判断是否使用流式传输
    const isStreaming = !!(onMessage || onThinking || onComplete)

    // 构建请求体
    const requestBody = {
      model: model,
      messages: [],
      stream: isStreaming,
      stream_options: isStreaming ? {
        include_usage: true
      } : undefined,
      enable_thinking: true
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
      const response = await fetch(`${this.baseURL}/compatible-mode/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
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
                  
                  // 处理深度思考内容
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
      console.error('阿里云深度思考API调用失败:', error)
      throw error
    }
  }

  // 联网搜索调用（支持流式传输）
  async chatCompletionWithSearch(contactConfig, messages, onMessage = null) {
    const {
      model = 'qwen-plus',
      systemPrompt = ''
    } = contactConfig

    // 判断是否使用流式传输
    const isStreaming = !!onMessage

    // 构建请求体
    const requestBody = {
      model: model,
      messages: [],
      stream: isStreaming,
      enable_search: true
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
      const response = await fetch(`${this.baseURL}/compatible-mode/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      if (isStreaming) {
        // 流式传输处理
        return await this._handleStreamResponse(response, onMessage)
      } else {
        // 非流式传输
        const data = await response.json()
        return data
      }
    } catch (error) {
      console.error('阿里云联网搜索API调用失败:', error)
      throw error
    }
  }

  // 深度思考 + 联网搜索调用（支持流式和非流式）
  async chatCompletionWithThinkingAndSearch(contactConfig, messages, onMessage, onThinking, onComplete) {
    const {
      model = 'qwen-plus',
      systemPrompt = ''
    } = contactConfig

    // 判断是否使用流式传输
    const isStreaming = !!(onMessage || onThinking || onComplete)

    // 构建请求体
    const requestBody = {
      model: model,
      messages: [],
      stream: isStreaming,
      stream_options: isStreaming ? {
        include_usage: true
      } : undefined,
      enable_thinking: true,
      enable_search: true
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
      const response = await fetch(`${this.baseURL}/compatible-mode/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      if (isStreaming) {
        // 流式传输处理 - 同时处理深度思考和正常回复
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
                  
                  // 处理深度思考内容
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
              } catch (e) {
                console.warn('解析SSE数据失败:', e, '原始数据:', dataStr)
              }
            }
          }
        }
      } else {
        // 非流式传输
        const data = await response.json()
        return data
      }
    } catch (error) {
      console.error('阿里云深度思考+联网搜索API调用失败:', error)
      throw error
    }
  }
}

// 全局变量
window.AliyunAPI = AliyunAPI