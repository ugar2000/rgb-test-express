const express = require('express');
const router = express.Router();
const File = require('../models/file');
const User = require('../models/user');
const multer = require('multer');
const fs = require('fs');
const pdfLib = require('pdf-lib');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 МБ
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
            return cb(new Error('Only PDF files are allowed'));
        }
        cb(null, true);
    }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     File:
 *       type: object
 *       required:
 *         - filename
 *         - originalname
 *         - mimetype
 *         - size
 *         - uploadedBy
 *       properties:
 *         id:
 *           type: string
 *           description: Автоматически генерируемый ID файла
 *         filename:
 *           type: string
 *           description: Имя файла на сервере
 *         originalname:
 *           type: string
 *           description: Оригинальное имя файла
 *         mimetype:
 *           type: string
 *           description: MIME-тип файла (например, application/pdf)
 *         size:
 *           type: number
 *           description: Размер файла в байтах
 *         uploadedBy:
 *           type: string
 *           description: ID пользователя, загрузившего файл
 */

/**
 * @swagger
 * tags:
 *   name: Files
 *   description: API для управления файлами
 */

/**
 * @swagger
 * /files:
 *   post:
 *     summary: Загрузить файл
 *     tags: [Files]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               userId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Файл успешно загружен
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/File'
 *       400:
 *         description: Ошибка при загрузке файла
 */
router.post('/', upload.single('file'), async (req, res) => {
    try {
        const { userId } = req.body;

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const pdfDoc = await pdfLib.PDFDocument.load(fs.readFileSync(req.file.path));
        const pageCount = pdfDoc.getPageCount();

        const file = new File({
            filename: req.file.filename,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            pageCount,
            uploadedBy: userId
        });

        const savedFile = await file.save();
        user.files.push(savedFile._id); // Добавляем файл в массив files пользователя
        await user.save();

        res.status(201).json(savedFile);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * @swagger
 * /files/{id}:
 *   get:
 *     summary: Получить файл по ID
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID файла
 *     responses:
 *       200:
 *         description: Файл найден
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/File'
 *       404:
 *         description: Файл не найден
 */
router.get('/:id', async (req, res) => {
    try {
        const fileId = req.params.id;

        const file = await File.findById(fileId).populate('uploadedBy', 'name');

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        res.json(file);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /files/user/{userId}:
 *   get:
 *     summary: Получить все файлы пользователя с пагинацией
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID пользователя
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Номер страницы (по умолчанию 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Количество файлов на странице (по умолчанию 10)
 *     responses:
 *       200:
 *         description: Список файлов пользователя
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 files:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/File'
 *                 totalPages:
 *                   type: integer
 *                 currentPage:
 *                   type: integer
 */
router.get('/user/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const files = await File.find({ uploadedBy: userId })
            .skip(skip)
            .limit(limit);

        const totalFiles = await File.countDocuments({ uploadedBy: userId });

        const totalPages = Math.ceil(totalFiles / limit);

        res.json({
            files,
            totalPages,
            total: totalFiles,
            currentPage: page
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /files/all:
 *   get:
 *     summary: Получить все файлы
 *     tags: [Files]
 *     responses:
 *       200:
 *         description: Список всех файлов
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/File'
 */
router.get('/all', async (req, res) => {
    try {
        const files = await File.find();
        res.json(files);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
