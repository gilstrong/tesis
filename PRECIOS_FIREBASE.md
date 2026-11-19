# Configuración compartida de precios

## Catálogo y compatibilidad

La raíz del catálogo compartido es `config/precios_app` en Realtime Database. Las calculadoras de tesis, servicios generales, Booklet y el asistente de IA usan el mismo catálogo con escucha en tiempo real. Si todavía no existe, la aplicación usa los valores iniciales incluidos en `public/pricing-config.js` y no escribe nada en Firebase al arrancar.

Los precios antiguos de Booklet siguen en `config/precios_booklet`. La aplicación los lee como respaldo mientras `config/precios_app/booklet` todavía no tenga valores, pero las nuevas ediciones se guardan en el catálogo central. La carga no elimina ni modifica el nodo antiguo.

Las cotizaciones guardadas no se actualizan cuando cambia el catálogo. En servicios generales, los importes personalizados de una cotización continúan siendo propios de esa cotización y no se escriben en el catálogo.

## Servicios adicionales configurables

Los servicios adicionales se almacenan en `config/precios_app/customServices`. Se admiten hasta 50 entradas; cada una tiene un identificador estable, nombre, ubicación (`general` o `tesis`), modalidad (`fixed` o `unit`), precio base no negativo, etiqueta de cantidad, estado activo y hasta ocho campos configurables de tipo texto, número o lista. Cada lista admite entre una y 20 opciones con identificador y nombre; puede marcarse para que la opción seleccionada defina el precio. Solo un campo de lista por servicio puede definir el precio. Las opciones con precio reemplazan el precio base y, en modalidad `unit`, se multiplican por la cantidad. Los servicios existentes sin ubicación, etiqueta o campos se interpretan como servicios de Servicios Generales, con la etiqueta «Cantidad» y sin campos adicionales.

Solo los servicios activos se muestran en la calculadora indicada. Los servicios por unidad multiplican el precio por una cantidad entera positiva; los de precio fijo se cotizan una vez. Los campos obligatorios y las opciones de precio se validan antes de calcular. La etiqueta de la opción seleccionada se incluye en el detalle de la cotización; en Servicios Generales, sus identificadores se conservan para recalcular cantidades sin perder el precio elegido. Los valores introducidos para una cotización se guardan en su detalle, no en el catálogo global. Las ubicaciones y campos personalizados se reflejan en la cotización de Tesis, incluida su tabla/PDF. Los borradores de Servicios Generales pueden recalcularse si cambia el catálogo; las cotizaciones históricas guardadas no se recalculan.

## Reglas de Realtime Database

El archivo de referencia del repositorio es `tesis/database.rules.json`. Según confirmó el responsable del proyecto, las reglas necesarias para los precios ya se publicaron en Realtime Database. Este despliegue de la aplicación no publica ni modifica reglas de Firebase.

En las rutas `config/precios_app` y `config/precios_booklet`, la lectura está permitida y la escritura requiere un token autenticado con el claim `admin: true`. Antes de publicar futuras modificaciones de reglas, compara el archivo con la versión vigente en Firebase y conserva cualquier cambio posterior que no esté reflejado aquí.

## Acceso de administrador

El responsable del proyecto confirmó que el claim `admin: true` ya fue asignado y verificado mediante Firebase Admin para la cuenta administradora, conservando los demás claims. La autenticación por sí sola no concede permiso para editar precios: el cliente verifica el claim y Realtime Database lo vuelve a validar en cada escritura.

Después de asignar o cambiar un claim, la persona debe cerrar y volver a iniciar sesión para renovar su token. La asignación y revocación de claims debe hacerse únicamente desde un entorno confiable con Firebase Admin SDK; nunca desde el navegador ni guardando credenciales en el repositorio.

## Servicio separado

Estos cambios corresponden al servidor raíz (`server.js`) y a `public/`, que es lo que sirve la aplicación principal. `tesis/server.js` contiene una implementación independiente del asistente con su propio texto de precios; si ese servidor se despliega como un segundo servicio, necesitará una adaptación propia para leer `config/precios_app`. No se copiaron ni modificaron archivos de `tesis/public/`.
