import { describe, expect, it } from 'vitest'
import { extractRows, knowafestConnector } from './knowafest'

/**
 * Verbatim rows from the live Tamil-Nadu page, 2026-08-24: a plain row, a
 * `class="partner"` row, an FDP, and a multi-type row -- plus the header row
 * and the stray <h4> the real page leaves inside the table.
 */
const FIXTURE = `
  <table id="tablaDatos" class="table table-bordered">
					<tr ><th>Start Date</th>
						<th>Fest Name</th>
						<th class="optout">Fest Type</th>
						<th class="optout">College Name</th>
						<th >City</th>
					</tr>
				<h4>110 Upcoming College Fests </h4>
				   				  <tr   onClick="window.open('../events/2026/08/0614-krxgen-26-k-ramakrishnan-college-engineering-hackathon-tiruchirappalli' ); " >
						<td>24 Aug 2026</td>
						<td> KRXGEN 26 <span class="btn btn-sm u-btn-skew u-btn-primary g-mr-10 g-mb-15 float-right" >View More</span></td>
						<td class="optout" >Hackathon</td>
						<td class="optout">K.Ramakrishnan College of Engineering</td>
						<td >Tiruchirappalli</td>
					</tr>
					    				  <tr  class="partner"  onClick="window.open('../events/2026/08/0809-one-week-hybrid-workshop-chennai' ); " >
						<td>24 Aug 2026</td>
						<td> One Week Hybrid Mode (online + offline) Workshop on Innovation 2026 <span class="btn" >View More</span></td>
						<td class="optout" >Workshop</td>
						<td class="optout">Top Engineers</td>
						<td >Chennai</td>
					</tr>
					    				  <tr   onClick="window.open('../events/2026/07/2803-inventron-2026-mahendhirapuri' ); " >
						<td>25 Aug 2026</td>
						<td> INVENTRON 2026 <span class="btn" >View More</span></td>
						<td class="optout" >Technical, Workshop, Symposium, Hackathon</td>
						<td class="optout">Mahendra Institute of Technology</td>
						<td >Mahendhirapuri</td>
					</tr>
  </table>`

describe('extractRows', () => {
  const rows = extractRows(FIXTURE)

  it('parses every clickable row and skips the header', () => {
    expect(rows).toHaveLength(3)
  })

  it('reads the cells, stripping the View More button from the name', () => {
    expect(rows[0]).toEqual({
      path: 'events/2026/08/0614-krxgen-26-k-ramakrishnan-college-engineering-hackathon-tiruchirappalli',
      date: '24 Aug 2026',
      title: 'KRXGEN 26',
      types: 'Hackathon',
      college: 'K.Ramakrishnan College of Engineering',
      city: 'Tiruchirappalli',
    })
  })

  it('partner rows parse like any other', () => {
    expect(rows[1].city).toBe('Chennai')
    expect(rows[1].types).toBe('Workshop')
  })
})

describe('toEvent', () => {
  const rows = extractRows(FIXTURE)
  const event = knowafestConnector.toEvent!({ sourceUid: 'x', payload: rows[0] })!

  it('maps a row to an offline campus event', () => {
    expect(event.title).toBe('KRXGEN 26')
    expect(event.url).toBe(
      'https://www.knowafest.com/explore/events/2026/08/0614-krxgen-26-k-ramakrishnan-college-engineering-hackathon-tiruchirappalli',
    )
    expect(event.isOnline).toBe(false)
    expect(event.city).toBe('Tiruchirappalli')
    expect(event.organizer).toBe('K.Ramakrishnan College of Engineering')
  })

  it('parses the day-first date at day precision', () => {
    expect(event.startsAtLocal).toBe('2026-08-24T00:00:00')
    expect(event.datePrecision).toBe('day')
    expect(event.dateKind).toBe('start')
  })

  it('splits multi-type cells into lowercase tags', () => {
    const multi = knowafestConnector.toEvent!({ sourceUid: 'x', payload: rows[2] })!
    expect(multi.tags).toEqual(['technical', 'workshop', 'symposium', 'hackathon'])
    expect(multi.eventType).toBe('technical')
  })
})
