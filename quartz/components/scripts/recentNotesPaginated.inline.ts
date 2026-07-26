// Клиентская пагинация списка "Последние статьи" на главной.
// Все <li> уже отрендерены; скрываем все, кроме текущей страницы.
function setupPagination() {
  const containers = document.querySelectorAll<HTMLElement>(".recent-paginated")
  containers.forEach((container) => {
    const perPage = parseInt(container.dataset.perPage ?? "10", 10)
    const items = Array.from(container.querySelectorAll<HTMLElement>(".recent-paginated-li"))
    const nav = container.querySelector<HTMLElement>(".recent-paginated-nav")
    const prev = container.querySelector<HTMLButtonElement>(".rp-prev")
    const next = container.querySelector<HTMLButtonElement>(".rp-next")
    const status = container.querySelector<HTMLElement>(".rp-status")
    if (!nav || !prev || !next || !status) return

    const totalPages = Math.max(1, Math.ceil(items.length / perPage))
    let page = 0

    const render = () => {
      items.forEach((li, i) => {
        li.style.display = Math.floor(i / perPage) === page ? "" : "none"
      })
      status.textContent = `${page + 1} / ${totalPages}`
      prev.disabled = page === 0
      next.disabled = page >= totalPages - 1
    }

    if (totalPages > 1) nav.style.display = ""

    const onPrev = () => {
      if (page > 0) {
        page--
        render()
      }
    }
    const onNext = () => {
      if (page < totalPages - 1) {
        page++
        render()
      }
    }
    prev.addEventListener("click", onPrev)
    next.addEventListener("click", onNext)
    window.addCleanup(() => {
      prev.removeEventListener("click", onPrev)
      next.removeEventListener("click", onNext)
    })

    render()
  })
}

document.addEventListener("nav", () => {
  setupPagination()
})
