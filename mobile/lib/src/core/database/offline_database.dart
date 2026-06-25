import 'dart:convert';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class OfflineDatabase {
  static final OfflineDatabase instance = OfflineDatabase._init();
  static Database? _database;

  OfflineDatabase._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('ktc_offline.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 1,
      onCreate: _createDB,
    );
  }

  Future<void> _createDB(Database db, int version) async {
    // 1. Cached Courses Table
    await db.execute('''
      CREATE TABLE cached_courses (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        shortDescription TEXT,
        durationHours INTEGER,
        completionPct REAL DEFAULT 0.0
      )
    ''');

    // 2. Cached Modules Table
    await db.execute('''
      CREATE TABLE cached_modules (
        id TEXT PRIMARY KEY,
        courseId TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        sortOrder INTEGER DEFAULT 0
      )
    ''');

    // 3. Cached Lessons Table
    await db.execute('''
      CREATE TABLE cached_lessons (
        id TEXT PRIMARY KEY,
        moduleId TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        contentText TEXT,
        durationMinutes INTEGER,
        lessonType TEXT,
        videoUrl TEXT,
        pdfUrl TEXT,
        isCompleted INTEGER DEFAULT 0,
        videoProgressSecs INTEGER DEFAULT 0
      )
    ''');

    // 4. Cached Quizzes Table
    await db.execute('''
      CREATE TABLE cached_quizzes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        timeLimitMins INTEGER,
        totalMarks INTEGER,
        questionCount INTEGER DEFAULT 0
      )
    ''');

    // 5. Cached Quiz Questions Table
    await db.execute('''
      CREATE TABLE cached_quiz_questions (
        id TEXT PRIMARY KEY,
        quizId TEXT NOT NULL,
        questionText TEXT NOT NULL,
        questionType TEXT NOT NULL,
        marks INTEGER DEFAULT 1,
        optionsJson TEXT NOT NULL
      )
    ''');

    // 6. Offline Watch Progress Sync Queue
    await db.execute('''
      CREATE TABLE offline_progress_sync (
        lessonId TEXT PRIMARY KEY,
        progressSeconds INTEGER DEFAULT 0,
        isCompleted INTEGER DEFAULT 0,
        synced INTEGER DEFAULT 0
      )
    ''');

    // 7. Offline Quiz Attempts Sync Queue
    await db.execute('''
      CREATE TABLE offline_quiz_attempts_sync (
        id TEXT PRIMARY KEY,
        quizId TEXT NOT NULL,
        answersJson TEXT NOT NULL,
        startedAt TEXT NOT NULL,
        synced INTEGER DEFAULT 0
      )
    ''');
  }

  // ==================== CACHE ACTIONS ====================

  Future<void> cacheCourses(List<dynamic> batches) async {
    final db = await instance.database;
    final batch = db.batch();

    // Clear old courses and modules/lessons to prevent stale data
    batch.delete('cached_courses');
    batch.delete('cached_modules');
    batch.delete('cached_lessons');

    for (var b in batches) {
      final course = b['course'];
      if (course == null) continue;

      batch.insert(
        'cached_courses',
        {
          'id': course['id'],
          'title': course['title'] ?? '',
          'shortDescription': course['shortDescription'] ?? '',
          'durationHours': course['durationHours'] ?? 0,
          'completionPct': (b['completionPct'] as num?)?.toDouble() ?? 0.0,
        },
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    }
    await batch.commit(noResult: true);
  }

  Future<void> cacheSyllabus(String courseId, Map<String, dynamic> courseData) async {
    final db = await instance.database;
    final batch = db.batch();

    final modules = courseData['modules'] as List<dynamic>? ?? [];
    for (var m in modules) {
      batch.insert(
        'cached_modules',
        {
          'id': m['id'],
          'courseId': courseId,
          'title': m['title'] ?? '',
          'description': m['description'] ?? '',
          'sortOrder': m['sortOrder'] ?? 0,
        },
        conflictAlgorithm: ConflictAlgorithm.replace,
      );

      final lessons = m['lessons'] as List<dynamic>? ?? [];
      for (var l in lessons) {
        String? videoUrl;
        String? pdfUrl;

        final videos = l['lessonVideos'] as List<dynamic>?;
        if (videos != null && videos.isNotEmpty) {
          videoUrl = videos[0]['cdnUrl'] ?? videos[0]['rawUrl'];
        }

        final notes = l['lessonNotes'] as List<dynamic>?;
        if (notes != null && notes.isNotEmpty) {
          pdfUrl = notes[0]['fileUrl'];
        }

        batch.insert(
          'cached_lessons',
          {
            'id': l['id'],
            'moduleId': m['id'],
            'title': l['title'] ?? '',
            'description': l['description'] ?? '',
            'contentText': l['contentText'] ?? '',
            'durationMinutes': l['durationMinutes'] ?? 0,
            'lessonType': l['lessonType'] ?? 'VIDEO',
            'videoUrl': videoUrl ?? '',
            'pdfUrl': pdfUrl ?? '',
          },
          conflictAlgorithm: ConflictAlgorithm.replace,
        );
      }
    }
    await batch.commit(noResult: true);
  }

  Future<void> cacheQuizzes(List<dynamic> quizzes) async {
    final db = await instance.database;
    final batch = db.batch();

    batch.delete('cached_quizzes');

    for (var q in quizzes) {
      batch.insert(
        'cached_quizzes',
        {
          'id': q['id'],
          'title': q['title'] ?? '',
          'description': q['description'] ?? '',
          'timeLimitMins': q['timeLimitMins'] ?? 30,
          'totalMarks': q['totalMarks'] ?? 100,
          'questionCount': q['_count']?['questions'] ?? 0,
        },
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    }
    await batch.commit(noResult: true);
  }

  Future<void> cacheQuizQuestions(String quizId, Map<String, dynamic> quizData) async {
    final db = await instance.database;
    final batch = db.batch();

    batch.delete('cached_quiz_questions', where: 'quizId = ?', whereArgs: [quizId]);

    final questions = quizData['questions'] as List<dynamic>? ?? [];
    for (var q in questions) {
      final options = q['options'] as List<dynamic>? ?? [];
      batch.insert(
        'cached_quiz_questions',
        {
          'id': q['id'],
          'quizId': quizId,
          'questionText': q['questionText'] ?? '',
          'questionType': q['questionType'] ?? 'MCQ_SINGLE',
          'marks': q['marks'] ?? 1,
          'optionsJson': jsonEncode(options),
        },
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    }
    await batch.commit(noResult: true);
  }

  // ==================== QUERY CACHES ====================

  Future<List<Map<String, dynamic>>> getCachedCourses() async {
    final db = await instance.database;
    final courses = await db.query('cached_courses');
    return courses.map((c) {
      return {
        'completionPct': c['completionPct'],
        'code': 'OFFLINE_MODE',
        'course': {
          'id': c['id'],
          'title': c['title'],
          'shortDescription': c['shortDescription'],
          'durationHours': c['durationHours'],
        }
      };
    }).toList();
  }

  Future<Map<String, dynamic>?> getCachedCourseSyllabus(String courseId) async {
    final db = await instance.database;
    final modules = await db.query('cached_modules', where: 'courseId = ?', whereArgs: [courseId], orderBy: 'sortOrder ASC');
    if (modules.isEmpty) return null;

    final List<Map<String, dynamic>> modulesList = [];
    for (var m in modules) {
      final lessons = await db.query('cached_lessons', where: 'moduleId = ?', whereArgs: [m['id']]);
      modulesList.add({
        'id': m['id'],
        'title': m['title'],
        'description': m['description'],
        'sortOrder': m['sortOrder'],
        'lessons': lessons.map((l) {
          return {
            'id': l['id'],
            'title': l['title'],
            'description': l['description'],
            'contentText': l['contentText'],
            'durationMinutes': l['durationMinutes'],
            'lessonType': l['lessonType'],
            'lessonVideos': l['videoUrl'] != '' ? [{'cdnUrl': l['videoUrl']}] : [],
            'lessonNotes': l['pdfUrl'] != '' ? [{'fileUrl': l['pdfUrl']}] : [],
          };
        }).toList(),
      });
    }

    return {
      'id': courseId,
      'modules': modulesList,
    };
  }

  Future<List<Map<String, dynamic>>> getCachedQuizzes() async {
    final db = await instance.database;
    final quizzes = await db.query('cached_quizzes');
    return quizzes.map((q) {
      return {
        'id': q['id'],
        'title': q['title'],
        'description': q['description'],
        'timeLimitMins': q['timeLimitMins'],
        'totalMarks': q['totalMarks'],
        '_count': {'questions': q['questionCount']},
        'attempts': [] // Empty since offline has no synced list
      };
    }).toList();
  }

  Future<Map<String, dynamic>?> getCachedQuiz(String quizId) async {
    final db = await instance.database;
    final quizzes = await db.query('cached_quizzes', where: 'id = ?', whereArgs: [quizId]);
    if (quizzes.isEmpty) return null;

    final q = quizzes.first;
    final questions = await db.query('cached_quiz_questions', where: 'quizId = ?', whereArgs: [quizId]);

    final List<Map<String, dynamic>> questionList = [];
    for (var quest in questions) {
      questionList.add({
        'id': quest['id'],
        'questionText': quest['questionText'],
        'questionType': quest['questionType'],
        'marks': quest['marks'],
        'options': jsonDecode(quest['optionsJson'] as String),
      });
    }

    return {
      'id': q['id'],
      'title': q['title'],
      'description': q['description'],
      'timeLimitMins': q['timeLimitMins'],
      'totalMarks': q['totalMarks'],
      'questions': questionList,
    };
  }

  // ==================== WATCH PROGRESS CACHE / SYNC ====================

  Future<int> getSavedWatchProgress(String lessonId) async {
    final db = await instance.database;
    final records = await db.query('offline_progress_sync', where: 'lessonId = ?', whereArgs: [lessonId]);
    if (records.isNotEmpty) {
      return records.first['progressSeconds'] as int? ?? 0;
    }
    return 0;
  }

  Future<void> saveWatchProgress(String lessonId, int seconds, bool isCompleted) async {
    final db = await instance.database;
    await db.insert(
      'offline_progress_sync',
      {
        'lessonId': lessonId,
        'progressSeconds': seconds,
        'isCompleted': isCompleted ? 1 : 0,
        'synced': 0,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<List<Map<String, dynamic>>> getUnsyncedProgress() async {
    final db = await instance.database;
    return await db.query('offline_progress_sync', where: 'synced = 0');
  }

  Future<void> markProgressSynced(String lessonId) async {
    final db = await instance.database;
    await db.update(
      'offline_progress_sync',
      {'synced': 1},
      where: 'lessonId = ?',
      whereArgs: [lessonId],
    );
  }

  // ==================== OFFLINE QUIZ ATTEMPTS CACHE / SYNC ====================

  Future<void> saveOfflineQuizAttempt(String attemptId, String quizId, List<Map<String, dynamic>> answers) async {
    final db = await instance.database;
    await db.insert(
      'offline_quiz_attempts_sync',
      {
        'id': attemptId,
        'quizId': quizId,
        'answersJson': jsonEncode(answers),
        'startedAt': DateTime.now().toIso8601String(),
        'synced': 0,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<List<Map<String, dynamic>>> getUnsyncedQuizAttempts() async {
    final db = await instance.database;
    return await db.query('offline_quiz_attempts_sync', where: 'synced = 0');
  }

  Future<void> markQuizAttemptSynced(String attemptId) async {
    final db = await instance.database;
    await db.update(
      'offline_quiz_attempts_sync',
      {'synced': 1},
      where: 'id = ?',
      whereArgs: [attemptId],
    );
  }
}
