class UserModel {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String? phone;
  final String? avatarUrl;
  final String role;
  final bool isEmailVerified;
  final bool requiresPasswordChange;
  final StudentModel? student;

  UserModel({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    this.phone,
    this.avatarUrl,
    required this.role,
    required this.isEmailVerified,
    required this.requiresPasswordChange,
    this.student,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as String,
      email: json['email'] as String,
      firstName: json['firstName'] as String? ?? '',
      lastName: json['lastName'] as String? ?? '',
      phone: json['phone'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
      role: json['role'] as String? ?? 'STUDENT',
      isEmailVerified: json['isEmailVerified'] as bool? ?? false,
      requiresPasswordChange: json['requiresPasswordChange'] as bool? ?? false,
      student: json['student'] != null
          ? StudentModel.fromJson(json['student'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'firstName': firstName,
      'lastName': lastName,
      'phone': phone,
      'avatarUrl': avatarUrl,
      'role': role,
      'isEmailVerified': isEmailVerified,
      'requiresPasswordChange': requiresPasswordChange,
      'student': student?.toJson(),
    };
  }
}

class StudentModel {
  final String id;
  final String studentCode;
  final String? collegeId;
  final String? enrollmentNumber;
  final String? branch;
  final int? graduationYear;
  final List<String> skills;
  final String? placementStatus;
  final bool profileCompleted;
  final double? cgpa;
  final String? resumeUrl;
  final String? linkedinUrl;
  final String? githubUrl;

  StudentModel({
    required this.id,
    required this.studentCode,
    this.collegeId,
    this.enrollmentNumber,
    this.branch,
    this.graduationYear,
    required this.skills,
    this.placementStatus,
    required this.profileCompleted,
    this.cgpa,
    this.resumeUrl,
    this.linkedinUrl,
    this.githubUrl,
  });

  factory StudentModel.fromJson(Map<String, dynamic> json) {
    return StudentModel(
      id: json['id'] as String,
      studentCode: json['studentCode'] as String? ?? '',
      collegeId: json['collegeId'] as String?,
      enrollmentNumber: json['enrollmentNumber'] as String?,
      branch: json['branch'] as String?,
      graduationYear: json['graduationYear'] as int?,
      skills: (json['skills'] as List<dynamic>?)?.map((e) => e as String).toList() ?? [],
      placementStatus: json['placementStatus'] as String?,
      profileCompleted: json['profileCompleted'] as bool? ?? false,
      cgpa: json['cgpa'] != null ? (json['cgpa'] as num).toDouble() : null,
      resumeUrl: json['resumeUrl'] as String?,
      linkedinUrl: json['linkedinUrl'] as String?,
      githubUrl: json['githubUrl'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'studentCode': studentCode,
      'collegeId': collegeId,
      'enrollmentNumber': enrollmentNumber,
      'branch': branch,
      'graduationYear': graduationYear,
      'skills': skills,
      'placementStatus': placementStatus,
      'profileCompleted': profileCompleted,
      'cgpa': cgpa,
      'resumeUrl': resumeUrl,
      'linkedinUrl': linkedinUrl,
      'githubUrl': githubUrl,
    };
  }
}
