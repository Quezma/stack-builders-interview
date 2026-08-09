export const HACKER_NEWS_URL = 'https://news.ycombinator.com/'

export const fetchPage = async (url) => {
  const response = await fetch(url)

  if (!response.ok) throw new Error(`${url} responded with status ${response.status}`)

  return response.text()
}
