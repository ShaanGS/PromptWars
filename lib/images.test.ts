import { describe, expect, it } from 'vitest'
import { bestImageUrl } from './images'

const ALLEVENTS = 'https://cdn-ip.allevents.in/rs:fill:500:250/plain/x/banner.jpg'
const DEVPOST =
  'https://d112y698adiu2z.cloudfront.net/photos/production/challenge_thumbnails/004/663/632/datas/medium_square.jpg'

describe('bestImageUrl', () => {
  it('passes null through', () => {
    expect(bestImageUrl(null)).toBeNull()
  })

  it('asks AllEvents for the whole banner instead of its top-and-bottom crop', () => {
    expect(bestImageUrl(ALLEVENTS)).toBe(
      'https://cdn-ip.allevents.in/rs:fit:1200:675/plain/x/banner.jpg',
    )
  })

  it('upgrades a Devpost thumbnail from 200px to the 300px rendition', () => {
    expect(bestImageUrl(DEVPOST)).toBe(DEVPOST.replace('medium_square', 'large'))
  })

  it('upgrades Devpost .png assets too -- the extension varies per asset', () => {
    const png = DEVPOST.replace('.jpg', '.png')
    expect(bestImageUrl(png)).toBe(png.replace('medium_square', 'large'))
  })

  it('leaves a URL that is already the large rendition alone', () => {
    const large = DEVPOST.replace('medium_square', 'large')
    expect(bestImageUrl(large)).toBe(large)
  })

  it('leaves other hosts untouched', () => {
    const devfolio = 'https://assets.devfolio.co/hackathons/abc/assets/cover/628.png'
    expect(bestImageUrl(devfolio)).toBe(devfolio)
  })
})
