const form = document.querySelector('#search')
const input = document.querySelector('#q')
const status = document.querySelector('#status')
const results = document.querySelector('#results')

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  const q = input.value.trim()
  status.textContent = 'عم ندور...'
  results.replaceChildren()
  try {
    const response = await fetch('/api/products?' + new URLSearchParams({ q }))
    if (!response.ok) throw new Error('Search failed')
    const data = await response.json()
    status.textContent = data.items.length === 1 ? 'قطعة واحدة' : `${data.items.length} قطع`
    for (const item of data.items) {
      const li = document.createElement('li')
      const text = document.createElement('div')
      const title = document.createElement('strong')
      title.textContent = item.title
      text.append(title)
      if (item.updatedAt) {
        const when = document.createElement('span')
        when.textContent = item.updatedAt
        text.append(when)
      }
      const price = document.createElement('b')
      price.className = 'price'
      price.textContent = `$${item.price}`
      li.append(text, price)
      results.append(li)
    }
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Search failed'
  }
})
