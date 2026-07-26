import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative } from "../util/path"
import { QuartzPluginData } from "../plugins/vfile"
import { byDateAndAlphabetical } from "./PageList"
import style from "./styles/recentNotesPaginated.scss"
import { Date, getDate } from "./Date"
import { GlobalConfiguration } from "../cfg"
import { i18n } from "../i18n"
import { classNames } from "../util/lang"
// @ts-ignore
import script from "./scripts/recentNotesPaginated.inline"

interface Options {
  title?: string
  // Сколько статей на одной странице пагинации.
  perPage: number
  filter: (f: QuartzPluginData) => boolean
  sort: (f1: QuartzPluginData, f2: QuartzPluginData) => number
}

const defaultOptions = (cfg: GlobalConfiguration): Options => ({
  perPage: 10,
  filter: () => true,
  sort: byDateAndAlphabetical(cfg),
})

export default ((userOpts?: Partial<Options>) => {
  const RecentNotesPaginated: QuartzComponent = ({
    allFiles,
    fileData,
    displayClass,
    cfg,
  }: QuartzComponentProps) => {
    const opts = { ...defaultOptions(cfg), ...userOpts }
    // Все подходящие заметки, отсортированные по дате (убывание). Пагинация — на клиенте.
    const pages = allFiles.filter(opts.filter).sort(opts.sort)
    return (
      <div
        class={classNames(displayClass, "recent-paginated")}
        data-per-page={String(opts.perPage)}
      >
        <h3>{opts.title ?? i18n(cfg.locale).components.recentNotes.title}</h3>
        <ul class="recent-paginated-ul">
          {pages.map((page) => {
            const title = page.frontmatter?.title ?? i18n(cfg.locale).propertyDefaults.title
            return (
              <li class="recent-paginated-li">
                {page.dates && (
                  <span class="meta">
                    <Date date={getDate(cfg, page)!} locale={cfg.locale} />
                  </span>
                )}
                <a href={resolveRelative(fileData.slug!, page.slug!)} class="internal">
                  {title}
                </a>
              </li>
            )
          })}
        </ul>
        <nav class="recent-paginated-nav" style="display:none">
          <button class="rp-btn rp-prev" type="button" aria-label="Назад">
            ←
          </button>
          <span class="rp-status"></span>
          <button class="rp-btn rp-next" type="button" aria-label="Вперёд">
            →
          </button>
        </nav>
      </div>
    )
  }
  RecentNotesPaginated.css = style
  RecentNotesPaginated.afterDOMLoaded = script
  return RecentNotesPaginated
}) satisfies QuartzComponentConstructor
