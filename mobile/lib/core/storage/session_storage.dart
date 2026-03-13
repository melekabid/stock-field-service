import 'package:hive_flutter/hive_flutter.dart';
import '../constants/app_constants.dart';
import '../../shared/models/session_user.dart';

class SessionStorage {
  final Box<dynamic> _box = Hive.box(AppConstants.sessionBox);

  void save(String token, SessionUser user) {
    _box.put('token', token);
    _box.put('user', user.toJson());
  }

  SessionUser? currentUser() {
    final raw = _box.get('user');
    if (raw is Map) {
      return SessionUser.fromJson(Map<String, dynamic>.from(raw));
    }
    return null;
  }

  bool get isAuthenticated => _box.get('token') != null;

  String? get currentApiOrigin => _box.get('api_origin') as String?;

  void saveApiOrigin(String origin) {
    _box.put('api_origin', origin);
  }
}
