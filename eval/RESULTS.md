# Evaluation results

Run on 2026-11-15 with gemini-3.5-flash.

| Sample | Type detected | Fields correct | Flags | Values dropped by checks | Time |
|---|---|---|---|---|---|
| insurance-carewell | yes | 14/14 | 6/6 expected, 6 raised | 0 | 10.3s |
| insurance-sunrise | yes | 14/14 | 2/2 expected, 2 raised | 0 | 5.2s |
| offer-bluefern | yes | 21/21 | 1/1 expected, 1 raised | 0 | 6.3s |
| offer-northwind | yes | 21/21 | 4/4 expected, 4 raised | 0 | 7.1s |
| rent-greenview | yes | 19/19 | 6/6 expected, 6 raised | 0 | 7.3s |
| rent-lakeside | yes | 19/19 | 0/0 expected, 0 raised | 0 | 12.2s |

**Field-level accuracy: 108/108 (100.0%)**. Correct "not stated" (null) answers count as correct.
**Flag recall: 19/19 (100.0%), precision: 19/19 (100.0%)**.
