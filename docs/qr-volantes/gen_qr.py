"""Genera los QR de los volantes y VERIFICA cada uno leyéndolo de vuelta."""
import os, segno, cv2

SALIDA = ('/Users/carlosbeuvrin/Documents/KETING MEDIA/NUEVOS PROYECTOS ANTIGRAVITY/'
          'TOOGO 4 claude + 10 plantillas/toogo-shop-builder-main/docs/qr-volantes')
os.makedirs(SALIDA, exist_ok=True)

MORADO = '#8346C1'

# Se codifica el dominio con www: es el canónico. Sin www hay un redirect 308
# en cada escaneo — funciona igual, pero son milisegundos regalados.
CODIGOS = [
    ('toogo-qr-negro',   'https://www.toogo.store', '#000000',
     'El principal. Negro sobre blanco = máximo contraste = lee siempre.'),
    ('toogo-qr-morado',  'https://www.toogo.store', MORADO,
     'Igual pero en morado de marca. Lee bien, contraste suficiente.'),
    ('toogo-qr-volantes', 'https://www.toogo.store/?utm_source=volante&utm_medium=print&utm_campaign=volantes_2026',
     '#000000', 'Con etiquetas para medir: distingue en Analytics quién llegó por el volante.'),
]

print(f'{"archivo":<22}{"módulos":>9}{"versión":>9}  verificación')
for nombre, url, color, _ in CODIGOS:
    qr = segno.make(url, error='h')          # 30% de tolerancia a daño/tinta corrida
    svg = f'{SALIDA}/{nombre}.svg'
    png = f'{SALIDA}/{nombre}.png'
    # SVG = vector, es el que va a la imprenta (escala sin pixelarse).
    qr.save(svg, scale=10, border=4, dark=color, light='#FFFFFF')
    # PNG grande por si la imprenta lo pide en mapa de bits.
    qr.save(png, scale=40, border=4, dark=color, light='#FFFFFF')

    leido, _, _ = cv2.QRCodeDetector().detectAndDecode(cv2.imread(png))
    estado = 'OK' if leido == url else f'FALLÓ → leyó «{leido[:40]}»'
    print(f'{nombre:<22}{qr.symbol_size()[0]:>9}{str(qr.version):>9}  {estado}')

print('\nGuardado en docs/qr-volantes/')
