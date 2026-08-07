# 00 · Contexto de Portafolio Ayniq

## Posicionamiento

Portafolio DataGob es una demo reusable del portafolio Ayniq. Su objetivo es mostrar cómo una organización puede gobernar la demanda de proyectos de datos con agentes, criterios objetivos, trazabilidad y comités de decisión.

## Rol de la implementación de referencia

La solución incluye una implementación demostrativa parametrizable para aterrizar el modelo en una organización tipo, con gobierno de datos, dominios, subdominios, demanda recibida por correo, priorización y pase de MVP a producción.

La solución no debe quedar limitada a una organización específica. El core debe mantenerse reusable para distintos clientes, sectores y dominios.

## Diseño reusable

La plataforma debe permitir adaptar:

- Nombre de organización.
- Dominios y subdominios.
- Criterios y pesos de priorización.
- Roles de comité.
- Estados de ciclo de vida.
- Reglas de MVP a producción.
- Tableros y métricas ejecutivas.

## Principio de producto

El activo debe construirse como acelerador de consultoría y demostración para Ayniq.

Estructura conceptual:

Ayniq Portfolio > Portafolio DataGob > Implementación de referencia > Motor reusable de gobierno de demanda > Flujos agénticos > GCP con infraestructura como código.

## Implicancia para el desarrollo

Todo componente core debe evitar depender exclusivamente de nombres, dominios o reglas de una organización específica. La implementación demostrativa debe aparecer como configuración, datos de ejemplo o branding sustituible.

## North Star

Demostrar que Ayniq puede convertir solicitudes dispersas de datos en un portafolio gobernado, priorizado y trazable, apoyado por agentes e infraestructura reproducible en GCP.
