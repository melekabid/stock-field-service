# API Documentation

Base URL: `/api`

## Auth

- `POST /auth/login`
- `GET /auth/me`

## Users

- `GET /users`
- `POST /users`
- `PATCH /users/:id`

## Products and Stock

- `GET /categories`
- `GET /suppliers`
- `GET /warehouses`
- `GET /products`
- `POST /products`
- `GET /products/:id/history`
- `GET /stock`
- `POST /stock/movements`

## Clients and Sites

- `GET /clients`
- `GET /sites`

## Interventions

- `GET /interventions`
- `GET /interventions/:id`
- `POST /interventions`
- `POST /interventions/:id/start`
- `POST /interventions/:id/complete`

## Reports and Files

- `POST /uploads/image`
- `GET /reports/summary`
- `POST /reports/interventions/:id/pdf`

## Operations

- `GET /notifications/me`
- `GET /audit`
- `GET /health`

## Sample Completion Payload

```json
{
  "notes": "Filter replaced and system restarted.",
  "items": [
    {
      "productId": "prod_123",
      "warehouseId": "wh_123",
      "quantity": 1
    }
  ],
  "photoUrls": [
    "/static/1710001111.jpg"
  ],
  "signerName": "Jane Client",
  "signatureUrl": "/static/signatures/sign_1710001111.png"
}
```
