export function generateOpenAPISpec() {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Pricing API',
      version: '0.1.0',
      description: 'API for managing pricing, rates, FX snapshots, taxes, fees, and quotes'
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3002',
        description: 'Pricing Microservice'
      }
    ],
    paths: {
      '/lodging-classes': {
        get: {
          summary: 'List lodging classes',
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { type: 'string', enum: ['HOSTEL', 'STANDARD', 'PREMIUM'] }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: 'Create a lodging class',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', enum: ['HOSTEL', 'STANDARD', 'PREMIUM'] }
                  },
                  required: ['name']
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Lodging class created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/lodging-classes/{name}': {
        delete: {
          summary: 'Delete a lodging class',
          parameters: [
            {
              name: 'name',
              in: 'path',
              required: true,
              schema: { type: 'string', enum: ['HOSTEL', 'STANDARD', 'PREMIUM'] }
            }
          ],
          responses: {
            '204': {
              description: 'Lodging class deleted'
            },
            '404': {
              description: 'Not found'
            }
          }
        }
      },
      '/rate-table': {
        get: {
          summary: 'List rate table entries',
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/RateRow' }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: 'Create a rate table entry',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RateRowInput' }
              }
            }
          },
          responses: {
            '201': {
              description: 'Rate row created',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/RateRow' }
                }
              }
            }
          }
        }
      },
      '/rate-table/{id}': {
        put: {
          summary: 'Update a rate table entry',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' }
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RateRowInput' }
              }
            }
          },
          responses: {
            '200': {
              description: 'Rate row updated',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/RateRow' }
                }
              }
            }
          }
        },
        delete: {
          summary: 'Delete a rate table entry',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' }
            }
          ],
          responses: {
            '204': {
              description: 'Rate row deleted'
            }
          }
        }
      },
      '/fx-snapshots': {
        get: {
          summary: 'List FX snapshots',
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/FXSnapshot' }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: 'Create an FX snapshot',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FXSnapshotInput' }
              }
            }
          },
          responses: {
            '201': {
              description: 'FX snapshot created',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/FXSnapshot' }
                }
              }
            }
          }
        }
      },
      '/fx-snapshots/{id}': {
        delete: {
          summary: 'Delete an FX snapshot',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' }
            }
          ],
          responses: {
            '204': {
              description: 'FX snapshot deleted'
            }
          }
        }
      },
      '/taxes-fees': {
        get: {
          summary: 'List taxes and fees',
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/TaxFee' }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: 'Create a tax/fee entry',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TaxFeeInput' }
              }
            }
          },
          responses: {
            '201': {
              description: 'Tax/fee created',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/TaxFee' }
                }
              }
            }
          }
        }
      },
      '/taxes-fees/{id}': {
        delete: {
          summary: 'Delete a tax/fee entry',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' }
            }
          ],
          responses: {
            '204': {
              description: 'Tax/fee deleted'
            }
          }
        }
      },
      '/promos': {
        get: {
          summary: 'List promotions',
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Promo' }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: 'Create a promotion',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PromoInput' }
              }
            }
          },
          responses: {
            '201': {
              description: 'Promo created',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Promo' }
                }
              }
            }
          }
        }
      },
      '/promos/{id}': {
        delete: {
          summary: 'Delete a promotion',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' }
            }
          ],
          responses: {
            '204': {
              description: 'Promo deleted'
            }
          }
        }
      },
      '/quotes': {
        post: {
          summary: 'Create a pricing quote',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/QuoteRequest' }
              }
            }
          },
          responses: {
            '201': {
              description: 'Quote created',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Quote' }
                }
              }
            }
          }
        }
      },
      '/quotes/{id}/explain': {
        get: {
          summary: 'Get quote explanation',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' }
            }
          ],
          responses: {
            '200': {
              description: 'Quote explanation',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/QuoteExplanation' }
                }
              }
            }
          }
        }
      },
      '/optimize/sequence': {
        post: {
          summary: 'Optimize city sequence',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OptimizeRequest' }
              }
            }
          },
          responses: {
            '200': {
              description: 'Optimization result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      suggested_order: {
                        type: 'array',
                        items: { type: 'object' }
                      },
                      estimated_delta: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    components: {
      schemas: {
        RateRow: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            city_id: { type: 'string' },
            season_id: { type: 'string' },
            lodging_class: { type: 'string', enum: ['HOSTEL', 'STANDARD', 'PREMIUM'] },
            base_nightly_usd: { type: 'number', minimum: 0 },
            notes: { type: 'string' }
          },
          required: ['id', 'city_id', 'season_id', 'lodging_class', 'base_nightly_usd']
        },
        RateRowInput: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            city_id: { type: 'string' },
            season_id: { type: 'string' },
            lodging_class: { type: 'string', enum: ['HOSTEL', 'STANDARD', 'PREMIUM'] },
            base_nightly_usd: { type: 'number', minimum: 0 },
            notes: { type: 'string' }
          },
          required: ['city_id', 'season_id', 'lodging_class', 'base_nightly_usd']
        },
        FXSnapshot: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            as_of_date: { type: 'string', format: 'date' },
            base_currency: { type: 'string', length: 3 },
            quote_currency: { type: 'string', length: 3 },
            rate: { type: 'number', exclusiveMinimum: 0 }
          },
          required: ['id', 'as_of_date', 'base_currency', 'quote_currency', 'rate']
        },
        FXSnapshotInput: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            as_of_date: { type: 'string', format: 'date' },
            base_currency: { type: 'string', length: 3 },
            quote_currency: { type: 'string', length: 3 },
            rate: { type: 'number', exclusiveMinimum: 0 }
          },
          required: ['as_of_date', 'base_currency', 'quote_currency', 'rate']
        },
        TaxFee: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            city_id: { type: 'string' },
            lodging_tax_pct: { type: 'number', minimum: 0, maximum: 1 },
            fixed_fee_usd: { type: 'number', minimum: 0 }
          },
          required: ['id', 'city_id']
        },
        TaxFeeInput: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            city_id: { type: 'string' },
            lodging_tax_pct: { type: 'number', minimum: 0, maximum: 1 },
            fixed_fee_usd: { type: 'number', minimum: 0 }
          },
          required: ['city_id']
        },
        Promo: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            code: { type: 'string' },
            type: { type: 'string', enum: ['percent', 'fixed'] },
            value: { type: 'number', minimum: 0 },
            valid_from: { type: 'string', format: 'date' },
            valid_to: { type: 'string', format: 'date' }
          },
          required: ['id', 'code', 'type', 'value']
        },
        PromoInput: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            code: { type: 'string', minLength: 1 },
            type: { type: 'string', enum: ['percent', 'fixed'] },
            value: { type: 'number', minimum: 0 },
            valid_from: { type: 'string', format: 'date' },
            valid_to: { type: 'string', format: 'date' }
          },
          required: ['code', 'type', 'value']
        },
        QuoteRequest: {
          type: 'object',
          properties: {
            segments: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  city_id: { type: 'string' },
                  start_date: { type: 'string', format: 'date' },
                  end_date: { type: 'string', format: 'date' },
                  lodging_class: { type: 'string', enum: ['HOSTEL', 'STANDARD', 'PREMIUM'] }
                },
                required: ['city_id', 'start_date', 'end_date', 'lodging_class']
              },
              minItems: 1
            },
            currency: { type: 'string', length: 3, default: 'USD' },
            promo_code: { type: 'string' }
          },
          required: ['segments']
        },
        Quote: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            currency: { type: 'string' },
            total_usd: { type: 'number' },
            per_segment: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  segment: { type: 'object' },
                  nights: { type: 'integer' },
                  base_usd: { type: 'number' }
                }
              }
            },
            fx_used: {
              type: 'array',
              items: { $ref: '#/components/schemas/FXSnapshot' }
            },
            taxes_fees_applied: {
              type: 'array',
              items: { $ref: '#/components/schemas/TaxFee' }
            },
            promo_code: { type: 'string' }
          },
          required: ['id', 'currency', 'total_usd', 'per_segment']
        },
        QuoteExplanation: {
          type: 'object',
          properties: {
            quote_id: { type: 'string' },
            total_usd: { type: 'number' },
            per_segment: { type: 'array' },
            fx_used: { type: 'array' },
            taxes_fees_applied: { type: 'array' },
            promo_code: { type: 'string' },
            notes: { type: 'string' }
          }
        },
        OptimizeRequest: {
          type: 'object',
          properties: {
            cities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  city_id: { type: 'string' },
                  nights: { type: 'integer', minimum: 1 }
                },
                required: ['city_id', 'nights']
              },
              minItems: 1
            },
            objective: { type: 'string', enum: ['min_cost', 'min_travel_time'] }
          },
          required: ['cities', 'objective']
        }
      }
    }
  }
}

