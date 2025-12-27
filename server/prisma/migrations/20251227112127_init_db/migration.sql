-- CreateTable
CREATE TABLE "status" (
    "id_status" SERIAL NOT NULL,
    "nombre_status" TEXT NOT NULL,

    CONSTRAINT "status_pkey" PRIMARY KEY ("id_status")
);

-- CreateTable
CREATE TABLE "genero" (
    "id_genero" SERIAL NOT NULL,
    "nombre_genero" TEXT NOT NULL,

    CONSTRAINT "genero_pkey" PRIMARY KEY ("id_genero")
);

-- CreateTable
CREATE TABLE "autor" (
    "id_autor" SERIAL NOT NULL,
    "nombre_autor" TEXT NOT NULL,

    CONSTRAINT "autor_pkey" PRIMARY KEY ("id_autor")
);

-- CreateTable
CREATE TABLE "tienda" (
    "id_tienda" SERIAL NOT NULL,
    "nombre_tienda" TEXT NOT NULL,

    CONSTRAINT "tienda_pkey" PRIMARY KEY ("id_tienda")
);

-- CreateTable
CREATE TABLE "compra" (
    "id_compra" SERIAL NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "fecha_compra" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referido" TEXT,
    "id_tienda" INTEGER NOT NULL,

    CONSTRAINT "compra_pkey" PRIMARY KEY ("id_compra")
);

-- CreateTable
CREATE TABLE "libro" (
    "id_libro" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "isbn" TEXT,
    "id_autor" INTEGER NOT NULL,
    "id_genero" INTEGER NOT NULL,
    "id_status" INTEGER NOT NULL,
    "id_compra" INTEGER,

    CONSTRAINT "libro_pkey" PRIMARY KEY ("id_libro")
);

-- CreateTable
CREATE TABLE "valoracion" (
    "id_valoracion" SERIAL NOT NULL,
    "fecha_valoracion" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "puntuacion" INTEGER NOT NULL,
    "comentario" TEXT,
    "id_libro" INTEGER NOT NULL,

    CONSTRAINT "valoracion_pkey" PRIMARY KEY ("id_valoracion")
);

-- CreateIndex
CREATE UNIQUE INDEX "status_nombre_status_key" ON "status"("nombre_status");

-- CreateIndex
CREATE UNIQUE INDEX "genero_nombre_genero_key" ON "genero"("nombre_genero");

-- CreateIndex
CREATE UNIQUE INDEX "autor_nombre_autor_key" ON "autor"("nombre_autor");

-- CreateIndex
CREATE UNIQUE INDEX "tienda_nombre_tienda_key" ON "tienda"("nombre_tienda");

-- CreateIndex
CREATE UNIQUE INDEX "libro_isbn_key" ON "libro"("isbn");

-- CreateIndex
CREATE UNIQUE INDEX "valoracion_id_libro_key" ON "valoracion"("id_libro");

-- AddForeignKey
ALTER TABLE "compra" ADD CONSTRAINT "compra_id_tienda_fkey" FOREIGN KEY ("id_tienda") REFERENCES "tienda"("id_tienda") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "libro" ADD CONSTRAINT "libro_id_autor_fkey" FOREIGN KEY ("id_autor") REFERENCES "autor"("id_autor") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "libro" ADD CONSTRAINT "libro_id_genero_fkey" FOREIGN KEY ("id_genero") REFERENCES "genero"("id_genero") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "libro" ADD CONSTRAINT "libro_id_status_fkey" FOREIGN KEY ("id_status") REFERENCES "status"("id_status") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "libro" ADD CONSTRAINT "libro_id_compra_fkey" FOREIGN KEY ("id_compra") REFERENCES "compra"("id_compra") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valoracion" ADD CONSTRAINT "valoracion_id_libro_fkey" FOREIGN KEY ("id_libro") REFERENCES "libro"("id_libro") ON DELETE RESTRICT ON UPDATE CASCADE;
