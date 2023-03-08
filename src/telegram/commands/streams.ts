import { Menu } from '@grammyjs/menu'
import dedent from 'dedent'
import { CommandContext, Context } from 'grammy'
import { singleton } from 'tsyringe'
import { DatabaseChannelsService } from '../../database/channels.service.js'
import { ApiService } from '../../twitch/api.service.js'
import { getRandomEmoji } from '../../utils/get-random-emoji.js'
import { channelsOnlineMessage } from '../../utils/messages.js'
import { TTLCache } from '../../utils/ttl-cache.js'
import { TelegramMiddleware } from '../telegram.middleware.js'
import { TelegramService } from '../telegram.service.js'

@singleton()
export class StreamsCommmand {
  private readonly cache = new TTLCache(600 * 1000 /* 600 sec */)
  private refreshStreamsMenu: Menu<Context>

  constructor(
    private readonly telegramService: TelegramService,
    private readonly telegramMiddleware: TelegramMiddleware,
    private readonly channelsService: DatabaseChannelsService,
    private readonly apiService: ApiService
  ) {}

  init(): void {
    this.refreshStreamsMenu = new Menu('refresh-streams-menu').text(
      'Обновить',
      async (ctx) => {
        const { streams, cache } = await this.fetchStreams()
        const date = new Date().toLocaleString('ru-RU', {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric',
          timeZone: 'Europe/Moscow',
          hour12: false
        })

        const message = dedent`
          ${streams}

          _Последнее обновление: ${date}_${
          cache ? ` (${getRandomEmoji()})` : ''
        }
        `

        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        })
      }
    )

    this.telegramService.use(this.refreshStreamsMenu)

    this.telegramService.command(
      'streams',
      (ctx, next) => this.telegramMiddleware.isForum(ctx, next),
      (ctx) => this.execute(ctx)
    )
  }

  private async execute(ctx: CommandContext<Context>): Promise<void> {
    const { streams } = await this.fetchStreams()

    if (!streams) {
      await ctx.reply('Нет стримов 😢')
      return
    }

    await ctx.reply(streams, {
      parse_mode: 'Markdown',
      reply_markup: this.refreshStreamsMenu,
      disable_web_page_preview: true,
      reply_to_message_id: ctx.message?.message_id,
      message_thread_id: ctx.message?.message_thread_id
    })
  }

  private async fetchStreams(): Promise<{ streams: string; cache: boolean }> {
    const cachedStreams = this.cache.get('streams')
    if (cachedStreams) return { streams: cachedStreams, cache: true }

    const channelsIds = this.channelsService
      .data!.channels.filter(
        (channel) => channel.stream && channel.stream.endedAt === null
      )
      .map((channel) => channel.channelId)

    const streams = channelsIds.length
      ? await this.apiService.getStreamsByIds(channelsIds)
      : []

    const msg = channelsOnlineMessage(streams)
    this.cache.set('streams', msg)

    return { streams: msg, cache: false }
  }
}
