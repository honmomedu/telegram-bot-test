# SecureAttend — Supabase Migrations

ឯកសារ SQL ទាំងអស់សម្រាប់ database។ ទាំងអស់ idempotent (`IF NOT EXISTS`) —
run ម្ដងទៀតក៏មិន error ទេ។

## របៀបប្រើ (How to run)

បើក **Supabase → SQL Editor** រួច run តាមលំដាប់៖

| លំដាប់ | ឯកសារ | តារាង |
|--------|--------|--------|
| 1 | `001_initial.sql` | `telegram_users`, `broadcast_history` |
| 2 | `002_system_settings.sql` | `system_settings` (ទីតាំងការិយាល័យ) |
| 3 | `003_face_and_qr.sql` | `face_enrollments`, `qr_codes` |
| 4 | `004_employees_attendance.sql` | `employees`, `attendance` |
| 5 | `005_payroll.sql` | `payroll_settings`, `payroll_adjustments` + employee salary fields |
| 6 | `006_substitute_manual_hours.sql` | `manual_hours` + attendance.substitute_for |
| 7 | `007_work_schedule.sql` | employees.work_schedule (weekly part-time schedule) |

**ផ្លូវកាត់៖** អាច run ឯកសារតែមួយ [`../schema.sql`](../schema.sql) ដែលមានគ្រប់តារាងទាំងអស់ក្នុងពេលតែមួយ។

## ផ្ទៀងផ្ទាត់ (Verify)

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

គួរឃើញ៖ `attendance`, `broadcast_history`, `employees`,
`face_enrollments`, `qr_codes`, `system_settings`, `telegram_users`

## កំណត់សម្គាល់ (Notes)

- API នីមួយៗមាន **fallback** (in-memory) ដូច្នេះ app នៅដំណើរការ ទោះបីមិនទាន់ run SQL ក៏ដោយ
  ប៉ុន្តែទិន្នន័យនឹង**មិនរក្សាទុកជាប់**រហូតដល់ run migration។
- ពេលបន្ថែម migration ថ្មី → ដាក់លេខបន្ត (`005_...`, `006_...`) ហើយ update តារាងខាងលើ។
