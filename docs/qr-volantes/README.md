# QR para volantes impresos

Los tres apuntan a `https://www.toogo.store` y **están verificados**: se generaron,
se volvieron a leer con un decodificador y devolvieron la URL correcta.

| Archivo | Para qué |
|---|---|
| `toogo-qr-negro.svg` | **El que debes usar.** Negro sobre blanco, máximo contraste |
| `toogo-qr-morado.svg` | Igual en morado de marca `#8346C1` |
| `toogo-qr-volantes.svg` | Con etiquetas de medición (ver abajo) |

De cada uno hay `.svg` y `.png`.

**Manda el SVG a la imprenta.** Es vectorial: escala a cualquier tamaño sin pixelarse.
El PNG es por si te lo piden en mapa de bits.

---

## Reglas para que funcione impreso

**Tamaño mínimo 2,5 cm.** Menos que eso falla con cámaras malas o poca luz. En un
volante que se lee de cerca, 2,5 a 3 cm está bien. Si va en un cartel que se mira de
lejos, más grande.

**No le quites el margen blanco.** Ese marco alrededor no es decoración: es la "zona
tranquila" que el lector necesita para encontrar el código. Es un error clásico en
diseño, recortarlo por estética y romperlo.

**Oscuro sobre claro, nunca al revés.** Un QR blanco sobre fondo oscuro falla en muchos
teléfonos.

**No lo pongas encima de una foto.** Fondo liso, blanco o muy claro.

**Pon la dirección escrita debajo**: `toogo.store`. Hay gente que prefiere teclear, y si
el QR sale mal impreso, tienes respaldo.

Están generados con corrección de errores alta (30%), así que aguantan tinta corrida,
un doblez o una mancha pequeña.

---

## El de medición

`toogo-qr-volantes.svg` lleva la dirección con etiquetas:

```
https://www.toogo.store/?utm_source=volante&utm_medium=print&utm_campaign=volantes_2026
```

El visitante no nota la diferencia: ve la misma página. Pero en Google Analytics puedes
filtrar por `volante` y saber **cuántas personas llegaron por los volantes** y cuántas se
registraron.

Si vas a imprimir, vale la pena: es la única forma de saber si el dinero del papel sirvió.
El código es más denso (61 módulos contra 37), así que imprímelo un poco más grande — 3 cm
mínimo.

---

## Cómo se regeneran

```bash
python3 -m venv qrenv && qrenv/bin/pip install segno opencv-python-headless
qrenv/bin/python gen_qr.py
```

El script `gen_qr.py` (en el scratchpad de la sesión) genera y **verifica** cada código
leyéndolo de vuelta. Si alguno no coincide con su URL, lo avisa en vez de guardarlo en
silencio.
