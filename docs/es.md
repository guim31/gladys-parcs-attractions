# Parques de atracciones (Parcs d'attractions)

Los **tiempos de espera en directo y los horarios de los parques de atracciones**, atracción por
atracción: PortAventura, Parque Warner Madrid, Disneyland Paris, Europa-Park, Efteling… y todos los
parques cubiertos por ThemeParks.wiki (unos 200 en el mundo). **Sin cuenta ni clave.**

**Powered by [ThemeParks.wiki](https://www.themeparks.wiki).** Integración no oficial, sin
vínculo con ThemeParks.wiki ni con ningún parque u operador: los nombres de parques y atracciones
son marcas de sus propietarios, citadas solo para identificarlos. Desarrollada sin visitar los
parques: los datos se comprobaron en directo el 30/10/2026. Sus comentarios son bienvenidos.

## Lo que obtiene

- Un **dispositivo por parque** que añada: parque abierto, horario de hoy (en la hora local del
  parque), espera media y número de atracciones averiadas.
- Un **dispositivo por atracción** que añada: tiempo de espera indicado (minutos), en servicio o
  no, estado (en servicio, averiada, cerrada, en renovación).
- Un **widget** «Tiempos de espera»: sus atracciones ordenadas por espera, en verde, naranja o
  rojo, con el horario de su parque.
- Cuatro **disparadores de escena**: la espera baja de un umbral, una atracción se avería, una
  atracción vuelve a estar en servicio, el parque abre.
- Una **acción de escena**: las esperas de sus atracciones en una frase lista para enviar.

## Requisitos

- Gladys Assistant **5.3.0** o posterior.
- Acceso a Internet desde Gladys: los datos vienen de la API de ThemeParks.wiki.
- Sin cuenta ni clave de API.

## Instalación

1. En Gladys, abra **Integraciones → Instalar desde GitHub**.
2. Introduzca `https://github.com/guim31/gladys-parcs-attractions` y confirme.
3. Abra la configuración de la integración una vez iniciada.

## Configuración

### Ajustes

- **Parques**: los parques europeos cubiertos por ThemeParks.wiki, los franceses primero. Elija uno
  o varios.
- **Otros parques**: cualquier otro parque de ThemeParks.wiki (América, Asia…), por su nombre o su
  identificador de ThemeParks.wiki, separados por comas: `Magic Kingdom Park, Tokyo DisneySea`. El
  nombre de un complejo (`Walt Disney World® Resort`) trae todos sus parques. Los acentos y las
  mayúsculas no importan.
- **Actualización**: cada 5, 10 o 15 minutos (5 por defecto, el mínimo que permite el servicio).
- **Idioma de nombres y mensajes**: francés por defecto. Los nombres de las funciones se fijan al
  añadir un dispositivo; los textos de estado, el widget y la acción de escena siguen este ajuste.

### Añadir parques y atracciones

Guarde la configuración: unos segundos después, la pestaña **Descubrir** lista cada parque elegido
y luego todas sus atracciones («PortAventura Park · Shambhala»). Añada a Gladys lo que le
interese: el parque por su horario, las atracciones importantes por sus esperas. Un parque con un
dispositivo añadido se sigue leyendo aunque lo desmarque.

### Comprobar

La acción **Estado** de la configuración lista los parques leídos, el número de atracciones
encontradas, la hora de la última lectura, el último error y los parques escritos por nombre que
no se encontraron.

## Dispositivos

**Parque** («Parc Asterix»):

| Función               | Tipo              | Valor                                                         |
| --------------------- | ----------------- | ------------------------------------------------------------- |
| Parque abierto        | entrada, binaria  | 1 durante el horario de apertura publicado del día            |
| Horario de hoy        | texto             | `09:00–18:00`, «cerrado hoy», en la hora local del parque     |
| Espera media          | duración, minutos | media de las esperas indicadas de las atracciones en servicio |
| Atracciones averiadas | contador          | atracciones anunciadas como averiadas por el parque           |

**Atracción** («Parc Asterix · Thunder 2 Zeus»):

| Función          | Tipo              | Valor                                                      |
| ---------------- | ----------------- | ---------------------------------------------------------- |
| Tiempo de espera | duración, minutos | espera indicada en la fila normal; **0 fuera de servicio** |
| En servicio      | entrada, binaria  | 1 en servicio, 0 averiada, cerrada o en renovación         |
| Estado           | texto             | en servicio, averiada, cerrada, en renovación              |

Las atracciones sin fila (zonas de juego, recorridos a pie) no publican espera. Los eventos de
noche con entrada aparte y las horas tempranas para clientes de hotel no cuentan como apertura del
parque.

## Widget del panel

**Tiempos de espera**: una fila por atracción (10 como máximo), con el nombre que le dio en Gladys:

- la espera, en **verde** hasta 15 minutos, **naranja** hasta 45, **rojo** a partir de ahí;
- «averiada», «cerrada»… en gris cuando la atracción no está en servicio, «datos desactualizados»
  cuando el servicio no responde desde hace 45 minutos.

Ajustes: las atracciones mostradas (todas por defecto), el orden (espera más corta o más larga
primero), la línea del **horario del parque** arriba («Parc Asterix: abierto hasta las 18:00») y el
botón de crédito **ThemeParks.wiki** abajo, ambos ocultables.

## Disparadores de escena

| Disparador                     | Cuándo                                                        | Campos              |
| ------------------------------ | ------------------------------------------------------------- | ------------------- |
| Espera por debajo de un umbral | la espera de una atracción en servicio baja al umbral o menos | atracciones, umbral |
| Atracción averiada             | una atracción en servicio se avería                           | atracciones         |
| Atracción de nuevo en servicio | una atracción averiada vuelve a estar en servicio             | atracciones         |
| El parque abre                 | un parque llega a su hora de apertura                         | parques             |

Umbrales: 5, 10, 15, 20, 30, 45 o 60 minutos. Una espera solo se compara entre dos lecturas en
servicio: la primera espera de la mañana no dispara nada. Un campo de atracción o parque vacío vale
para cualquiera de los seguidos. Variables: atracción, parque, espera (minutos); para el parque,
su nombre y su horario.

## Acción de escena

**Obtener los tiempos de espera**: las atracciones elegidas (todas por defecto) en una frase, para
un mensaje o un altavoz: «Thunder 2 Zeus: 70 minutos de espera. Osiris Convolvulis: averiada.»
Salidas: la frase, la espera más corta en minutos (-1 si ninguna atracción está en servicio) y el
número de atracciones en servicio, para un paso «Continuar solo si».

## Ejemplos de escenas

- **Fila corta**: disparador «Espera por debajo de un umbral» (Shambhala, 15 min) → enviar un
  mensaje a su teléfono.
- **Avería**: disparador «Atracción averiada» → mensaje «{{attraction_name}} está averiada».
- **Resumen de la mañana** el día de la visita: a las 08:30, acción «Obtener los tiempos de
  espera» → leer la frase en un altavoz.

## Datos y actualización

- Fuente: la API pública de [ThemeParks.wiki](https://www.themeparks.wiki), sin clave. Sus
  condiciones piden un User-Agent explícito, datos en directo leídos **como máximo una vez cada
  cinco minutos** (el servicio se actualiza a ese ritmo) y la mención «Powered by ThemeParks.wiki»
  donde se muestran los datos: la pantalla de configuración, esta guía y el widget la llevan.
- Una petición por parque y por actualización, más el horario una vez al día (o cada seis horas).
  El límite del servicio (300 peticiones por minuto) queda lejos; un rechazo (HTTP 429) suspende
  las lecturas el tiempo que indique.
- Las esperas son las que indican los parques: pueden diferir de la espera real.

## Solución de problemas

- **Nada en Descubrir**: compruebe que hay un parque elegido y guardado, y ejecute **Estado**.
- **«Parques no encontrados»**: compruebe la ortografía en el
  [directorio de ThemeParks.wiki](https://www.themeparks.wiki/browse/directory), o use el
  identificador del parque.
- **«datos desactualizados»**: el servicio no responde desde hace 45 minutos; la acción Estado
  muestra el último error.
- **Sin espera en una atracción**: el parque no la indica (zona de juego, recorrido a pie), o está
  cerrada.
- Registros: `LOG_LEVEL=debug` muestra cada lectura.

## Limitaciones

- Desarrollada sin el hardware (sin visitar los parques): sus comentarios son bienvenidos.
- Solo se lee la fila normal: ni single rider, ni filas virtuales, ni pases rápidos de pago.
- Los espectáculos y restaurantes no se ofrecen como dispositivos.
- Los horarios son los que publica el parque; un cambio no anunciado aparece en la siguiente
  lectura del horario.
- Los nombres de parques y atracciones vienen del servicio, sobre todo en inglés.

## Créditos

- Datos: [ThemeParks.wiki](https://www.themeparks.wiki) y sus colaboradores, de uso libre con
  mención.
- Integración: [guim31](https://github.com/guim31), licencia Apache-2.0.
