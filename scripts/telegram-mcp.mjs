import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const server = new McpServer({
  name: 'presales-telegram',
  version: '1.0.0',
})

function getConfig() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const defaultChatId = process.env.TELEGRAM_CHAT_ID
  const allowedChatIds = (process.env.TELEGRAM_ALLOWED_CHAT_IDS || defaultChatId || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  return { botToken, defaultChatId, allowedChatIds }
}

function assertConfig(chatId) {
  const config = getConfig()
  if (!config.botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is required.')
  }
  const resolvedChatId = chatId || config.defaultChatId
  if (!resolvedChatId) {
    throw new Error('chat_id or TELEGRAM_CHAT_ID is required.')
  }
  if (config.allowedChatIds.length > 0 && !config.allowedChatIds.includes(String(resolvedChatId))) {
    throw new Error('This chat_id is not allowed by TELEGRAM_ALLOWED_CHAT_IDS.')
  }
  return { ...config, chatId: resolvedChatId }
}

async function callTelegram(method, payload = {}, tokenOverride) {
  const token = tokenOverride || getConfig().botToken
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required.')

  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.ok) {
    const description = data?.description || `Telegram API request failed with status ${response.status}`
    throw new Error(description)
  }
  return data.result
}

function textResult(value) {
  return {
    content: [
      {
        type: 'text',
        text: typeof value === 'string' ? value : JSON.stringify(value, null, 2),
      },
    ],
  }
}

server.registerTool(
  'telegram_get_me',
  {
    description: 'Check the configured Telegram bot identity without exposing the bot token.',
    inputSchema: {},
  },
  async () => {
    const result = await callTelegram('getMe')
    return textResult({
      id: result.id,
      is_bot: result.is_bot,
      first_name: result.first_name,
      username: result.username,
    })
  },
)

server.registerTool(
  'telegram_send_message',
  {
    description: 'Send a Telegram message through the configured bot. Uses TELEGRAM_CHAT_ID when chat_id is omitted.',
    inputSchema: {
      text: z.string().min(1).max(4096).describe('Message text to send.'),
      chat_id: z.string().optional().describe('Optional target chat ID. Defaults to TELEGRAM_CHAT_ID.'),
      parse_mode: z.enum(['HTML', 'MarkdownV2']).optional().describe('Optional Telegram parse mode.'),
      disable_web_page_preview: z.boolean().optional().describe('Disable link previews.'),
    },
  },
  async ({ text, chat_id: chatId, parse_mode: parseMode, disable_web_page_preview: disablePreview }) => {
    const config = assertConfig(chatId)
    const result = await callTelegram('sendMessage', {
      chat_id: config.chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: disablePreview ?? true,
    }, config.botToken)

    return textResult({
      sent: true,
      message_id: result.message_id,
      chat: {
        id: result.chat?.id,
        type: result.chat?.type,
        title: result.chat?.title,
        username: result.chat?.username,
      },
      date: result.date,
    })
  },
)

server.registerTool(
  'telegram_get_updates',
  {
    description: 'Poll recent Telegram bot updates. Useful for finding a chat ID after sending a message to the bot.',
    inputSchema: {
      limit: z.number().int().min(1).max(100).optional().describe('Number of updates to return. Defaults to 10.'),
      offset: z.number().int().optional().describe('Update offset for Telegram long polling.'),
      timeout: z.number().int().min(0).max(30).optional().describe('Long polling timeout in seconds. Defaults to 0.'),
    },
  },
  async ({ limit = 10, offset, timeout = 0 }) => {
    const result = await callTelegram('getUpdates', {
      limit,
      offset,
      timeout,
      allowed_updates: ['message', 'channel_post'],
    })

    return textResult(result.map((update) => ({
      update_id: update.update_id,
      message_id: update.message?.message_id || update.channel_post?.message_id,
      date: update.message?.date || update.channel_post?.date,
      text: update.message?.text || update.channel_post?.text,
      chat: {
        id: update.message?.chat?.id || update.channel_post?.chat?.id,
        type: update.message?.chat?.type || update.channel_post?.chat?.type,
        title: update.message?.chat?.title || update.channel_post?.chat?.title,
        username: update.message?.chat?.username || update.channel_post?.chat?.username,
      },
      from: update.message?.from
        ? {
            id: update.message.from.id,
            is_bot: update.message.from.is_bot,
            first_name: update.message.from.first_name,
            username: update.message.from.username,
          }
        : undefined,
    })))
  },
)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((error) => {
  console.error('Telegram MCP server failed:', error)
  process.exit(1)
})
