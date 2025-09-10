-- MySQL demo schema & data
CREATE DATABASE IF NOT EXISTS empresa_demo CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE empresa_demo;

DROP TABLE IF EXISTS empleados;
DROP TABLE IF EXISTS departamentos;
DROP TABLE IF EXISTS sedes;

CREATE TABLE sedes (
  id INT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL
);

CREATE TABLE departamentos (
  id INT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL
);

CREATE TABLE empleados (
  id INT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  genero ENUM('M','F') NOT NULL,
  edad INT NOT NULL,
  salario DECIMAL(10,2) NOT NULL,
  sede_id INT NOT NULL,
  departamento_id INT NOT NULL,
  fecha_ingreso DATE NOT NULL,
  FOREIGN KEY (sede_id) REFERENCES sedes(id),
  FOREIGN KEY (departamento_id) REFERENCES departamentos(id)
);

-- Seed sedes
INSERT INTO sedes (id, nombre) VALUES
(1, 'Sede 1'),
(2, 'Sede 2'),
(3, 'Sede 3')
;

-- Seed departamentos
INSERT INTO departamentos (id, nombre) VALUES
(1, 'IT'),
(2, 'Ventas'),
(3, 'Finanzas'),
(4, 'RRHH'),
(5, 'Operaciones')
;

-- Seed empleados
INSERT INTO empleados (id, nombre, genero, edad, salario, sede_id, departamento_id, fecha_ingreso) VALUES
(1, 'Carlos Rodríguez', 'M', 28, 3839.00, 1, 2, '2025-08-03'),
(2, 'Felipe López', 'M', 25, 6791.00, 1, 1, '2020-08-10'),
(3, 'Sergio Pérez', 'M', 46, 3402.00, 3, 5, '2023-01-14'),
(4, 'Ana Pérez', 'F', 41, 4138.00, 3, 4, '2019-09-29'),
(5, 'Jorge García', 'M', 26, 4470.00, 1, 4, '2021-11-09'),
(6, 'Ana López', 'F', 44, 5645.00, 3, 1, '2024-03-11'),
(7, 'Carolina Rodríguez', 'F', 24, 3375.00, 3, 2, '2025-06-01'),
(8, 'Andrés García', 'M', 44, 7277.00, 1, 1, '2023-02-01'),
(9, 'Lucía Rodríguez', 'F', 37, 3584.00, 2, 2, '2024-10-31'),
(10, 'Sergio Pérez', 'M', 44, 4105.00, 1, 4, '2025-03-06'),
(11, 'Jorge García', 'M', 40, 8286.00, 1, 1, '2021-01-01'),
(12, 'Luis Martínez', 'M', 33, 8089.00, 3, 3, '2022-06-09'),
(13, 'Lucía Rodríguez', 'F', 55, 7415.00, 1, 2, '2020-12-12'),
(14, 'Carolina López', 'F', 28, 7174.00, 2, 2, '2023-07-15'),
(15, 'Carlos García', 'M', 47, 7885.00, 1, 2, '2018-09-18'),
(16, 'Sofía Martínez', 'F', 36, 4766.00, 2, 5, '2018-02-17'),
(17, 'Sergio Rodríguez', 'M', 27, 6404.00, 3, 3, '2022-11-16'),
(18, 'Diego García', 'M', 52, 5463.00, 3, 3, '2023-09-11'),
(19, 'Andrés Martínez', 'M', 29, 6063.00, 3, 2, '2019-10-24'),
(20, 'Felipe Rodríguez', 'M', 27, 7973.00, 2, 1, '2021-06-13'),
(21, 'Carlos Pérez', 'M', 25, 8981.00, 3, 1, '2018-10-11'),
(22, 'Pedro López', 'M', 36, 7322.00, 3, 2, '2024-10-20'),
(23, 'Sandra Martínez', 'F', 39, 6268.00, 3, 2, '2025-07-14'),
(24, 'Camila Martínez', 'F', 35, 6840.00, 2, 1, '2018-09-20'),
(25, 'Ana Martínez', 'F', 57, 4804.00, 3, 2, '2018-01-30'),
(26, 'Carlos Pérez', 'M', 41, 5580.00, 1, 1, '2023-10-07'),
(27, 'Andrés López', 'M', 28, 5462.00, 1, 5, '2024-05-27'),
(28, 'Sandra López', 'F', 26, 3794.00, 2, 2, '2025-05-23'),
(29, 'Laura López', 'F', 23, 5758.00, 2, 4, '2025-04-30'),
(30, 'Carlos López', 'M', 26, 6036.00, 3, 3, '2020-02-24'),
(31, 'Sergio López', 'M', 31, 4140.00, 1, 4, '2023-03-10'),
(32, 'Juan López', 'M', 23, 9428.00, 3, 1, '2018-03-02'),
(33, 'Luis Pérez', 'M', 50, 3875.00, 2, 4, '2022-07-01'),
(34, 'Pedro López', 'M', 36, 6795.00, 1, 4, '2023-02-07'),
(35, 'Sofía Martínez', 'F', 29, 3777.00, 3, 4, '2021-04-30'),
(36, 'Carlos Martínez', 'M', 23, 5563.00, 3, 5, '2021-07-08'),
(37, 'Carlos Martínez', 'M', 53, 3144.00, 2, 5, '2018-08-21'),
(38, 'Pedro García', 'M', 35, 8307.00, 3, 1, '2019-05-07'),
(39, 'Felipe Martínez', 'M', 25, 4217.00, 1, 5, '2025-05-16'),
(40, 'Paula Pérez', 'F', 35, 6175.00, 3, 3, '2022-06-10'),
(41, 'Andrés López', 'M', 20, 8754.00, 2, 1, '2024-12-19'),
(42, 'Juan Martínez', 'M', 36, 3042.00, 1, 5, '2021-11-30'),
(43, 'Luis Rodríguez', 'M', 48, 7450.00, 2, 2, '2021-05-24'),
(44, 'Sergio Rodríguez', 'M', 28, 7166.00, 3, 1, '2019-04-18'),
(45, 'Sergio Pérez', 'M', 58, 5725.00, 2, 3, '2021-11-05'),
(46, 'Andrés Martínez', 'M', 23, 4756.00, 2, 3, '2025-02-11'),
(47, 'Paula García', 'F', 28, 6145.00, 1, 3, '2019-10-24'),
(48, 'Daniela López', 'F', 27, 5616.00, 3, 1, '2019-09-03'),
(49, 'Jorge Martínez', 'M', 47, 4044.00, 3, 2, '2018-06-21'),
(50, 'Laura García', 'F', 35, 3842.00, 2, 2, '2021-12-19'),
(51, 'Carolina Pérez', 'F', 31, 6377.00, 1, 2, '2018-04-12'),
(52, 'Jorge López', 'M', 37, 4304.00, 3, 2, '2019-03-19'),
(53, 'Ana López', 'F', 49, 5864.00, 1, 2, '2021-06-04'),
(54, 'Luis García', 'M', 45, 5689.00, 3, 2, '2021-02-15'),
(55, 'Andrés Rodríguez', 'M', 45, 5283.00, 3, 5, '2024-01-06'),
(56, 'Ana García', 'F', 57, 5174.00, 2, 2, '2018-06-06'),
(57, 'Felipe López', 'M', 47, 8966.00, 2, 3, '2023-09-26'),
(58, 'Miguel Martínez', 'M', 22, 7572.00, 1, 3, '2018-01-07'),
(59, 'Jorge López', 'M', 59, 6571.00, 1, 3, '2025-06-10'),
(60, 'Andrés Martínez', 'M', 40, 4648.00, 2, 4, '2021-04-26')
;
