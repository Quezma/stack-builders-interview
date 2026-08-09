import { describe, it, expect, afterAll } from 'vitest'
import { createServer } from 'node:http'

import { fetchPage } from '../../src/adapters/hacker-news-page.js'

const startServer = (respond) =>
  new Promise((resolve) => {
    const server = createServer(respond)

    server.listen(0, '127.0.0.1', () =>
      resolve({
        url: `http://127.0.0.1:${server.address().port}/`,
        stop: () => new Promise((stopped) => server.close(stopped))
      })
    )
  })

const servers = []

const serverThat = async (respond) => {
  const server = await startServer(respond)

  servers.push(server)

  return server.url
}

afterAll(() => Promise.all(servers.map(({ stop }) => stop())))

describe('fetchPage', () => {
  describe('given a page that responds successfully', () => {
    it('reads the returned html', async () => {
      const url = await serverThat((_, response) => response.end('<html>hello</html>'))

      expect(await fetchPage(url)).toBe('<html>hello</html>')
    })
  })

  describe('given a page that responds with a server error', () => {
    it('fails naming the status code', async () => {
      const url = await serverThat((_, response) => {
        response.statusCode = 503
        response.end('unavailable')
      })

      await expect(fetchPage(url)).rejects.toThrow(/503/)
    })
  })

  describe('given a page that responds with not found', () => {
    it('fails naming the status code', async () => {
      const url = await serverThat((_, response) => {
        response.statusCode = 404
        response.end('missing')
      })

      await expect(fetchPage(url)).rejects.toThrow(/404/)
    })
  })

  describe('given an unreachable host', () => {
    it('fails', async () => {
      await expect(fetchPage('http://127.0.0.1:1/')).rejects.toThrow()
    })
  })
})
