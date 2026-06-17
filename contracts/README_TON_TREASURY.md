# FUTMUNDI TON-only Treasury v1

Contrato nativo TON para eliminar USDT/Jetton del flujo.

## Economía confirmada

- `1 TON = 40 gemas`
- Depósitos:
  - `320 gemas = 8 TON`
  - `1600 gemas = 40 TON`
  - `3200 gemas = 80 TON`
  - `6400 gemas = 160 TON`
  - `16000 gemas = 400 TON`
- Apuestas:
  - mínimo `8 TON`
- Torneo:
  - `8 TON`
- Retiros:
  - mínimo `160 gemas = 4 TON bruto`
  - máximo `3200 gemas = 80 TON bruto`
  - comisión `6% + 1 TON`
  - el usuario recibe: `bruto - 6% - 1 TON`
  - el `1 TON` va a `feeWallet`
  - el 6% queda dentro del Treasury

## Mensajes principales

### WithdrawTON

Opcode:

```txt
0x46544d01
```

TL-B:

```txt
withdraw_ton#46544d01 queryId:uint64 amount:coins to:address = WithdrawTON
```

Campos:

- `queryId`: uint64
- `amount`: TON bruto en nanotons
- `to`: wallet destino del usuario

### UpdateFees

Opcode:

```txt
0x46544d02
```

### Pause / Unpause

```txt
Pause:   0x46544d03
Unpause: 0x46544d04
```

### EmergencyWithdrawTON

Opcode:

```txt
0x46544d05
```

### UpdateFeeWallet

Opcode:

```txt
0x46544d06
```

## Seguridad

- Solo `owner` puede ejecutar retiros.
- Tiene pausa.
- Tiene emergency withdraw.
- No usa Jettons.
- No usa USDT.
- Solo TON nativo.

## Validación local

El contrato ya fue compilado con `@tact-lang/compiler` sin errores.
