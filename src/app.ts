import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import swaggerUi from 'swagger-ui-express'
import { randomUUID } from 'node:crypto'
import { lodgingClassSchema, rateRowSchema, fxSnapshotSchema, taxFeeSchema, promoSchema, quoteRequestSchema, optimizeRequestSchema } from './validators.js'
import type { FXSnapshot, Promo, RateRow, TaxFee, Quote } from './types.js'
import { generateOpenAPISpec } from './openapi-generator.js'
import pool from './db.js'
import { initLodgingClassCache, getLodgingClassId, getAllLodgingClassNames } from './lodging-helper.js'

const app = express()
app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

await initLodgingClassCache()

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'ms-pricing' }))

const openApiSpec = generateOpenAPISpec()
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec))
app.get('/openapi.json', (_req, res) => {
  res.json(openApiSpec)
})

// Lodging classes
app.get('/lodging-classes', async (_req, res) => {
  const names = await getAllLodgingClassNames()
  res.json(names)
})
app.post('/lodging-classes', async (req, res) => {
  const p = lodgingClassSchema.safeParse(req.body)
  if (!p.success) return res.status(400).json({ error: p.error.flatten() })

  try {
    const id = randomUUID()
    await pool.query(
      'INSERT INTO lodging_classes (id, name) VALUES (?, ?)',
      [id, p.data.name]
    )
    res.status(201).json({ name: p.data.name })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.put('/lodging-classes/:name', async (req, res) => {
  const oldName = req.params.name
  const p = lodgingClassSchema.safeParse(req.body)
  if (!p.success) return res.status(400).json({ error: p.error.flatten() })

  try {
    const [result]: any = await pool.query(
      'UPDATE lodging_classes SET name = ? WHERE name = ?',
      [p.data.name, oldName]
    )
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Not found' })
    }
    res.json({ name: p.data.name })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/lodging-classes/:name', async (req, res) => {
  try {
    const [result]: any = await pool.query(
      'DELETE FROM lodging_classes WHERE name = ?',
      [req.params.name]
    )
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Not found' })
    }
    res.status(204).send()
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// GET /rates - Query rates by city_id and lodging_class (for TravelPlannerMS compatibility)
app.get('/rates', async (req, res) => {
  try {
    const { city_id, lodging_class } = req.query

    if (!city_id || !lodging_class) {
      return res.status(400).json({ error: 'city_id and lodging_class are required' })
    }

    const lodgingClassId = await getLodgingClassId(String(lodging_class).toUpperCase() as any)
    if (!lodgingClassId) {
      return res.json([]) // Return empty array if lodging class not found
    }

    const [rows]: any = await pool.query(`
      SELECT
        r.id,
        r.city_id,
        r.season_id,
        l.name as lodging_class,
        r.base_nightly_usd as price_per_night,
        r.notes
      FROM rate_table r
      JOIN lodging_classes l ON r.lodging_class_id = l.id
      WHERE r.city_id = ? AND r.lodging_class_id = ?
    `, [city_id, lodgingClassId])

    res.json(rows)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/rate-table', async (_req, res) => {
  try {
    const [rows]: any = await pool.query(`
      SELECT
        r.id,
        r.city_id,
        r.season_id,
        l.name as lodging_class,
        r.base_nightly_usd,
        r.notes
      FROM rate_table r
      JOIN lodging_classes l ON r.lodging_class_id = l.id
    `)
    res.json(rows)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/rate-table', async (req, res) => {
  const p = rateRowSchema.safeParse(req.body)
  if (!p.success) return res.status(400).json({ error: p.error.flatten() })

  try {
    const id = p.data.id ?? randomUUID()
    const lodgingClassId = await getLodgingClassId(p.data.lodging_class)
    if (!lodgingClassId) {
      return res.status(400).json({ error: 'Invalid lodging class' })
    }

    await pool.query(
      'INSERT INTO rate_table (id, city_id, season_id, lodging_class_id, base_nightly_usd, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [id, p.data.city_id, p.data.season_id, lodgingClassId, p.data.base_nightly_usd, p.data.notes || null]
    )

    const row: RateRow = {
      id,
      city_id: p.data.city_id,
      season_id: p.data.season_id,
      lodging_class: p.data.lodging_class,
      base_nightly_usd: p.data.base_nightly_usd,
      notes: p.data.notes
    }
    res.status(201).json(row)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.put('/rate-table/:id', async (req, res) => {
  const id = req.params.id
  const p = rateRowSchema.partial({ id: true }).safeParse(req.body)
  if (!p.success) return res.status(400).json({ error: p.error.flatten() })

  try {
    const [existing]: any = await pool.query('SELECT * FROM rate_table WHERE id = ?', [id])
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Not found' })
    }

    const updates: string[] = []
    const values: any[] = []

    if (p.data.city_id) {
      updates.push('city_id = ?')
      values.push(p.data.city_id)
    }
    if (p.data.season_id) {
      updates.push('season_id = ?')
      values.push(p.data.season_id)
    }
    if (p.data.lodging_class) {
      const lodgingClassId = await getLodgingClassId(p.data.lodging_class)
      if (!lodgingClassId) {
        return res.status(400).json({ error: 'Invalid lodging class' })
      }
      updates.push('lodging_class_id = ?')
      values.push(lodgingClassId)
    }
    if (p.data.base_nightly_usd !== undefined) {
      updates.push('base_nightly_usd = ?')
      values.push(p.data.base_nightly_usd)
    }
    if (p.data.notes !== undefined) {
      updates.push('notes = ?')
      values.push(p.data.notes)
    }

    if (updates.length > 0) {
      values.push(id)
      await pool.query(
        `UPDATE rate_table SET ${updates.join(', ')} WHERE id = ?`,
        values
      )
    }

    const [updated]: any = await pool.query(`
      SELECT
        r.id,
        r.city_id,
        r.season_id,
        l.name as lodging_class,
        r.base_nightly_usd,
        r.notes
      FROM rate_table r
      JOIN lodging_classes l ON r.lodging_class_id = l.id
      WHERE r.id = ?
    `, [id])

    res.json(updated[0])
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/rate-table/:id', async (req, res) => {
  try {
    const [result]: any = await pool.query('DELETE FROM rate_table WHERE id = ?', [req.params.id])
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Not found' })
    }
    res.status(204).send()
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/fx-snapshots', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM fx_snapshots')
    res.json(rows)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/fx-snapshots', async (req, res) => {
  const p = fxSnapshotSchema.safeParse(req.body)
  if (!p.success) return res.status(400).json({ error: p.error.flatten() })

  try {
    const id = p.data.id ?? randomUUID()
    await pool.query(
      'INSERT INTO fx_snapshots (id, as_of_date, base_currency, quote_currency, rate) VALUES (?, ?, ?, ?, ?)',
      [id, p.data.as_of_date, p.data.base_currency, p.data.quote_currency, p.data.rate]
    )

    const row: FXSnapshot = {
      id,
      as_of_date: p.data.as_of_date,
      base_currency: p.data.base_currency,
      quote_currency: p.data.quote_currency,
      rate: p.data.rate
    }
    res.status(201).json(row)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.put('/fx-snapshots/:id', async (req, res) => {
  const id = req.params.id
  const p = fxSnapshotSchema.partial({ id: true }).safeParse(req.body)
  if (!p.success) return res.status(400).json({ error: p.error.flatten() })

  try {
    const updates: string[] = []
    const values: any[] = []

    if (p.data.as_of_date) {
      updates.push('as_of_date = ?')
      values.push(p.data.as_of_date)
    }
    if (p.data.base_currency) {
      updates.push('base_currency = ?')
      values.push(p.data.base_currency)
    }
    if (p.data.quote_currency) {
      updates.push('quote_currency = ?')
      values.push(p.data.quote_currency)
    }
    if (p.data.rate !== undefined) {
      updates.push('rate = ?')
      values.push(p.data.rate)
    }

    if (updates.length === 0) {
      const [row]: any = await pool.query('SELECT * FROM fx_snapshots WHERE id = ?', [id])
      if (row.length === 0) return res.status(404).json({ error: 'Not found' })
      return res.json(row[0])
    }

    values.push(id)
    const [result]: any = await pool.query(
      `UPDATE fx_snapshots SET ${updates.join(', ')} WHERE id = ?`,
      values
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Not found' })
    }

    const [updated]: any = await pool.query('SELECT * FROM fx_snapshots WHERE id = ?', [id])
    res.json(updated[0])
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/fx-snapshots/:id', async (req, res) => {
  try {
    const [result]: any = await pool.query('DELETE FROM fx_snapshots WHERE id = ?', [req.params.id])
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Not found' })
    }
    res.status(204).send()
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/taxes-fees', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, city_id, lodging_tax_percent as lodging_tax_pct, fixed_fee_usd FROM taxes_fees')
    res.json(rows)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/taxes-fees', async (req, res) => {
  const p = taxFeeSchema.safeParse(req.body)
  if (!p.success) return res.status(400).json({ error: p.error.flatten() })

  try {
    const id = p.data.id ?? randomUUID()
    await pool.query(
      'INSERT INTO taxes_fees (id, city_id, lodging_tax_percent, fixed_fee_usd) VALUES (?, ?, ?, ?)',
      [id, p.data.city_id, p.data.lodging_tax_pct || null, p.data.fixed_fee_usd || null]
    )

    const row: TaxFee = {
      id,
      city_id: p.data.city_id,
      lodging_tax_pct: p.data.lodging_tax_pct,
      fixed_fee_usd: p.data.fixed_fee_usd
    }
    res.status(201).json(row)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.put('/taxes-fees/:id', async (req, res) => {
  const id = req.params.id
  const p = taxFeeSchema.partial({ id: true }).safeParse(req.body)
  if (!p.success) return res.status(400).json({ error: p.error.flatten() })

  try {
    const updates: string[] = []
    const values: any[] = []

    if (p.data.city_id) {
      updates.push('city_id = ?')
      values.push(p.data.city_id)
    }
    if (p.data.lodging_tax_pct !== undefined) {
      updates.push('lodging_tax_percent = ?')
      values.push(p.data.lodging_tax_pct)
    }
    if (p.data.fixed_fee_usd !== undefined) {
      updates.push('fixed_fee_usd = ?')
      values.push(p.data.fixed_fee_usd)
    }

    if (updates.length === 0) {
      const [row]: any = await pool.query('SELECT id, city_id, lodging_tax_percent as lodging_tax_pct, fixed_fee_usd FROM taxes_fees WHERE id = ?', [id])
      if (row.length === 0) return res.status(404).json({ error: 'Not found' })
      return res.json(row[0])
    }

    values.push(id)
    const [result]: any = await pool.query(
      `UPDATE taxes_fees SET ${updates.join(', ')} WHERE id = ?`,
      values
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Not found' })
    }

    const [updated]: any = await pool.query('SELECT id, city_id, lodging_tax_percent as lodging_tax_pct, fixed_fee_usd FROM taxes_fees WHERE id = ?', [id])
    res.json(updated[0])
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/taxes-fees/:id', async (req, res) => {
  try {
    const [result]: any = await pool.query('DELETE FROM taxes_fees WHERE id = ?', [req.params.id])
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Not found' })
    }
    res.status(204).send()
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/promos', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, code, type, value, valid_from, valid_until as valid_to FROM promos')
    res.json(rows)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/promos', async (req, res) => {
  const p = promoSchema.safeParse(req.body)
  if (!p.success) return res.status(400).json({ error: p.error.flatten() })

  try {
    const id = p.data.id ?? randomUUID()
    await pool.query(
      'INSERT INTO promos (id, code, type, value, valid_from, valid_until) VALUES (?, ?, ?, ?, ?, ?)',
      [id, p.data.code, p.data.type, p.data.value, p.data.valid_from || null, p.data.valid_to || null]
    )

    const row: Promo = {
      id,
      code: p.data.code,
      type: p.data.type,
      value: p.data.value,
      valid_from: p.data.valid_from,
      valid_to: p.data.valid_to
    }
    res.status(201).json(row)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.put('/promos/:id', async (req, res) => {
  const id = req.params.id
  const p = promoSchema.partial({ id: true }).safeParse(req.body)
  if (!p.success) return res.status(400).json({ error: p.error.flatten() })

  try {
    const updates: string[] = []
    const values: any[] = []

    if (p.data.code) {
      updates.push('code = ?')
      values.push(p.data.code)
    }
    if (p.data.type) {
      updates.push('type = ?')
      values.push(p.data.type)
    }
    if (p.data.value !== undefined) {
      updates.push('value = ?')
      values.push(p.data.value)
    }
    if (p.data.valid_from !== undefined) {
      updates.push('valid_from = ?')
      values.push(p.data.valid_from)
    }
    if (p.data.valid_to !== undefined) {
      updates.push('valid_until = ?')
      values.push(p.data.valid_to)
    }

    if (updates.length === 0) {
      const [row]: any = await pool.query('SELECT id, code, type, value, valid_from, valid_until as valid_to FROM promos WHERE id = ?', [id])
      if (row.length === 0) return res.status(404).json({ error: 'Not found' })
      return res.json(row[0])
    }

    values.push(id)
    const [result]: any = await pool.query(
      `UPDATE promos SET ${updates.join(', ')} WHERE id = ?`,
      values
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Not found' })
    }

    const [updated]: any = await pool.query('SELECT id, code, type, value, valid_from, valid_until as valid_to FROM promos WHERE id = ?', [id])
    res.json(updated[0])
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/promos/:id', async (req, res) => {
  try {
    const [result]: any = await pool.query('DELETE FROM promos WHERE id = ?', [req.params.id])
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Not found' })
    }
    res.status(204).send()
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

function nightsBetween(start: string, end: string): number {
  const s = new Date(start)
  const e = new Date(end)
  return Math.max(0, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)))
}

function toSqlDate(value: string): string {
  if (!value) return value
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/)
  if (match) return match[1]
  const date = new Date(value)
  if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10)
  return value
}

function toNumber(value: any, defaultValue = 0): number {
  const coerced = Number(value)
  return Number.isFinite(coerced) ? coerced : defaultValue
}

async function determineSeasonId(cityId: string, date: string): Promise<string | null> {
  try {
    const DESTINATIONS_MS_URL = process.env.DESTINATIONS_MS_URL || 'http://136.113.150.64:3001'
    const response = await fetch(`${DESTINATIONS_MS_URL}/seasons`)

    if (!response.ok) {
      console.error('Failed to fetch seasons from DestinationsMS')
      return null
    }

    const allSeasons = await response.json()

    // Filter seasons for this city
    const citySeasons = allSeasons.filter((s: any) => s.city_id === cityId)

    if (citySeasons.length === 0) {
      return null
    }

    // Extract month from date (1-12)
    const month = new Date(date).getMonth() + 1

    // Find matching season based on month range
    for (const season of citySeasons) {
      const { start_month, end_month } = season

      // Handle normal range (e.g., June-August: 6-8)
      if (start_month <= end_month) {
        if (month >= start_month && month <= end_month) {
          return season.id
        }
      }
      // Handle wraparound (e.g., November-March: 11-3)
      else {
        if (month >= start_month || month <= end_month) {
          return season.id
        }
      }
    }

    return null // No season found
  } catch (error) {
    console.error('Error determining season:', error)
    return null
  }
}

app.post('/quotes', async (req, res) => {
  const p = quoteRequestSchema.safeParse(req.body)
  if (!p.success) return res.status(400).json({ error: p.error.flatten() })

  try {
    const { segments, currency, promo_code } = p.data
    const per_segment = await Promise.all(segments.map(async (seg) => {
      const nights = nightsBetween(seg.start_date, seg.end_date)
      const lodgingClassId = await getLodgingClassId(seg.lodging_class)
      if (!lodgingClassId) {
        throw new Error(`Invalid lodging_class: ${seg.lodging_class}`)
      }

      // Determine season based on start_date
      const seasonId = await determineSeasonId(seg.city_id, seg.start_date)

      let baseNightly = 0
      let actualSeasonId = seasonId

      if (seasonId) {
        // Try to get rate with season filter
        const [rates]: any = await pool.query(
          'SELECT base_nightly_usd, season_id FROM rate_table WHERE city_id = ? AND lodging_class_id = ? AND season_id = ? LIMIT 1',
          [seg.city_id, lodgingClassId, seasonId]
        )

        if (rates.length > 0) {
          baseNightly = toNumber(rates[0].base_nightly_usd, 0)
          actualSeasonId = rates[0].season_id
        } else {
          // Fallback: query without season filter
          const [fallbackRates]: any = await pool.query(
            'SELECT base_nightly_usd, season_id FROM rate_table WHERE city_id = ? AND lodging_class_id = ? LIMIT 1',
            [seg.city_id, lodgingClassId]
          )
          if (fallbackRates.length > 0) {
            baseNightly = toNumber(fallbackRates[0].base_nightly_usd, 0)
            actualSeasonId = fallbackRates[0].season_id
          }
        }
      } else {
        // No season found, query without season filter
        const [rates]: any = await pool.query(
          'SELECT base_nightly_usd, season_id FROM rate_table WHERE city_id = ? AND lodging_class_id = ? LIMIT 1',
          [seg.city_id, lodgingClassId]
        )
        if (rates.length > 0) {
          baseNightly = toNumber(rates[0].base_nightly_usd, 0)
          actualSeasonId = rates[0].season_id
        }
      }

      const base = baseNightly * nights

      return {
        segment: seg,
        nights,
        base_usd: base,
        season_id: actualSeasonId,
        base_nightly_usd: baseNightly,
        lodging_class_id: lodgingClassId
      }
    }))

    let total_usd = per_segment.reduce((sum, s) => sum + toNumber(s.base_usd, 0), 0)

    const [tf]: any = await pool.query('SELECT * FROM taxes_fees')
    const taxes_fees_applied: TaxFee[] = []

    for (const t of tf) {
      for (const ps of per_segment) {
        if (ps.segment.city_id === t.city_id) {
          const lodgingTaxPercent = toNumber(t.lodging_tax_percent, 0)
          const fixedFeeUsd = toNumber(t.fixed_fee_usd, 0)
          total_usd += (lodgingTaxPercent / 100) * toNumber(ps.base_usd, 0)
          total_usd += fixedFeeUsd
          taxes_fees_applied.push({
            id: t.id,
            city_id: t.city_id,
            lodging_tax_pct: lodgingTaxPercent,
            fixed_fee_usd: fixedFeeUsd
          })
        }
      }
    }

    let promoUsed
    if (promo_code) {
      const [promos]: any = await pool.query('SELECT * FROM promos WHERE code = ?', [promo_code])
      if (promos.length > 0) {
        promoUsed = promos[0]
        const promoValue = toNumber(promoUsed.value, 0)
        if (promoUsed.type === 'percent') {
          total_usd *= 1 - promoValue / 100
        } else {
          total_usd -= promoValue
        }
        if (total_usd < 0) total_usd = 0
      }
    }

    const [fxSnaps]: any = await pool.query('SELECT * FROM fx_snapshots')

    const id = randomUUID()
    await pool.query(
      'INSERT INTO quotes (id, total_usd, currency, promo_code) VALUES (?, ?, ?, ?)',
      [id, Number(total_usd.toFixed(2)), currency || 'USD', promo_code || null]
    )

    // Store quote segments with season data
    for (const ps of per_segment) {
      const segId = randomUUID()
      await pool.query(
        `INSERT INTO quote_segments
         (id, quote_id, city_id, start_date, end_date, lodging_class_id, nights, base_nightly_usd, season_multiplier, subtotal_usd)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          segId,
          id,
          ps.segment.city_id,
          toSqlDate(ps.segment.start_date),
          toSqlDate(ps.segment.end_date),
          ps.lodging_class_id,
          ps.nights,
          ps.base_nightly_usd,
          1.00, // Season multiplier (default to 1.00 for now)
          ps.base_usd
        ]
      )
    }

    const quote: Quote = {
      id,
      currency: currency ?? 'USD',
      total_usd: Number(total_usd.toFixed(2)),
      per_segment,
      fx_used: fxSnaps,
      taxes_fees_applied,
      promo_code: promoUsed?.code
    }

    res.status(201).json(quote)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/quotes/:id/explain', async (req, res) => {
  try {
    const [quotes]: any = await pool.query('SELECT * FROM quotes WHERE id = ?', [req.params.id])
    if (quotes.length === 0) {
      return res.status(404).json({ error: 'Not found' })
    }

    const q = quotes[0]
    res.json({
      quote_id: q.id,
      total_usd: q.total_usd,
      currency: q.currency,
      promo_code: q.promo_code,
      notes: 'Simplified pricing engine for Sprint 1 (no season surge, no FX conversion). Full quote details stored in database.'
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/optimize/sequence', (req, res) => {
  const p = optimizeRequestSchema.safeParse(req.body)
  if (!p.success) return res.status(400).json({ error: p.error.flatten() })
  res.json({ suggested_order: p.data.cities, estimated_delta: 0 })
})

app.use((_req, res) => res.status(404).json({ error: 'Not Found' }))

export default app
