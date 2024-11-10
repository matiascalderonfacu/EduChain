# Inicialización del proyecto

Para poder realizar la ejecución del contrato inteligentes se debe tener instalado lo siguiente:

- Visual Studio Code.
- Docker.
- Hyperledger Fabric Debugger (extensión de Visul Studio Code).
- Node JS.

Una vez que se cumpla con los requerimientos mencionados en el listado anterior ejecutar los siguiente:

1. Presionar el boton de `Start` de la extensión para que se generen los contenedores de docker que simulan los nodos de la red de blockchain.
2. En el menú de `Visual Studio Code` presionar la pestaña `Run` y luego presionar la opción `Start Debugging`.
3. Una vez que haya seguido los pasos mencionados anteriormente podrá comunicarse con el smart contract mediante la interacción con el archivo `educhain.fabric` ubicado en la carpeta raiz del repositorio.

# Diseño y arquitectura de la DApp

# Generación de IDs

Para la generación de los IDs representativos de cada una de los activos del contrato inteligente (Certificado y Solicitud de Verificación) se utilizó la libreria `crypto` de JavaScript y dependiendo de los datos importantes de cada uno de los activos se concatenaron mediante el caracter `|` procediendo luego con el hasheo del string concantenado. De esta forma se puede garantizar la unicidad de los certificados por estudiante, ya que el hash se genera de acuerdo al grado del titulo otorgado y referido a que estudiante, por lo que no se va a poder dar de alta otro titulo con los mismos datos de otro que ya haya sido guardado dentro de la blockchain.

## Estructura ID certificado

`<Nombre del estudiante>|<DNI del estudiante>|<Programa>|<Fecha de emisión>|<Grado>|<Titulo otorgado>|<Institución>`

## Estructura ID solicitud de verificación

`<ID del certificado>|<Nombre del empleador>|<Fecha de solicitud>`
