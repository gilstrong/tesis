const fs = require('fs');
const archiver = require('archiver');
const path = require('path');

// Carpeta de tu proyecto
const projectFolder = __dirname; // La carpeta donde está el script
// Carpeta donde se guardarán los backups
const backupFolder = path.join(__dirname, 'backups');

// Crear carpeta de backup si no existe
if (!fs.existsSync(backupFolder)) {
    fs.mkdirSync(backupFolder);
}

// Nombre del zip con fecha y hora
const date = new Date();
const timestamp = `${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}_${date.getHours().toString().padStart(2,'0')}${date.getMinutes().toString().padStart(2,'0')}`;
const zipName = `backup_${timestamp}.zip`;

const output = fs.createWriteStream(path.join(backupFolder, zipName));
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
    console.log(`Backup completado: ${zipName} (${archive.pointer()} bytes)`);
});

archive.on('error', err => { throw err; });
archive.pipe(output);

// Filtrar solo .js y .html
// 1. Guardar archivos críticos del Backend
archive.file(path.join(projectFolder, 'server.js'), { name: 'server.js' });
archive.file(path.join(projectFolder, 'package.json'), { name: 'package.json' });
if (fs.existsSync(path.join(projectFolder, 'upload_rnc.js'))) archive.file(path.join(projectFolder, 'upload_rnc.js'), { name: 'upload_rnc.js' });

// 2. Guardar toda la carpeta Public (Frontend)
if (fs.existsSync(path.join(projectFolder, 'public'))) {
    archive.directory(path.join(projectFolder, 'public'), 'public');
}

archive.finalize();
