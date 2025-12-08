# API Examples

Set `BASE` to backend base URL (e.g., `http://localhost:5000`).

## Auth

- Register

```bash
curl -X POST "$BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com","password":"secret123"}'
```

- Login

```bash
TOKEN=$(curl -s -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" -d '{"email":"alice@example.com","password":"secret123"}' | jq -r .data.token)
```

- Profile

```bash
curl -H "Authorization: Bearer $TOKEN" "$BASE/api/user/me"
```

## Checkout + Payments

- Create Checkout Session

```bash
curl -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"courseId":"<COURSE_ID>","scheduleId":null,"successUrl":"https://app.example.com/checkout-success?session_id={CHECKOUT_SESSION_ID}&return_to=%2Fdashboard%2Fcourses","cancelUrl":"https://app.example.com/checkout-cancel?session_id={CHECKOUT_SESSION_ID}&return_to=%2Fdashboard%2Fcourses"}' \
  "$BASE/api/checkout/create-session"
```

- Confirm Session

```bash
curl -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"sessionId":"<SESSION_ID>"}' \
  "$BASE/api/checkout/confirm-session"
```

- Cancel Session

```bash
curl -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"sessionId":"<SESSION_ID>"}' \
  "$BASE/api/checkout/cancel-session"
```

- My Payments

```bash
curl -H "Authorization: Bearer $TOKEN" "$BASE/api/payment/mine"
```

## Enrollment

- List Enrolled Courses

```bash
curl -H "Authorization: Bearer $TOKEN" "$BASE/api/enrollment"
```

- Check Enrollment

```bash
curl -H "Authorization: Bearer $TOKEN" "$BASE/api/enrollment/check/<COURSE_ID>"
```

## Practice

- Options

```bash
curl -H "Authorization: Bearer $TOKEN" "$BASE/api/practice/options?subject=Math"
```

- Start Session

```bash
curl -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"subject":"Math","questionCount":10,"mode":"Tutor"}' \
  "$BASE/api/practice/start"
```

- Answer

```bash
curl -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"sessionId":"<SESSION_ID>","questionId":"<QUESTION_ID>","userAnswer":"B","timeSpent":45}' \
  "$BASE/api/practice/answer"
```

- Submit

```bash
curl -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"sessionId":"<SESSION_ID>"}' \
  "$BASE/api/practice/submit"
```

## Test Sessions

- Start

```bash
curl -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"moduleType":"base"}' \
  "$BASE/api/test-session/start"
```

- Submit

```bash
curl -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"sessionId":"<SESSION_ID>","moduleType":"base","answers":{}}' \
  "$BASE/api/test-session/submit"
```
