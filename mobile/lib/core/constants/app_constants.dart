import 'package:flutter/foundation.dart';

class AppConstants {
  static const _overrideApiOrigin = String.fromEnvironment('API_ORIGIN');
  static const _localNetworkHost = '192.168.1.51';
  static const _recentLocalNetworkHosts = [
    '192.168.1.51',
    '192.168.1.41',
    '192.168.1.43',
    '192.168.1.61',
  ];
  static const _bonjourHost = 'MacBook-Air-de-Flapa.local';

  static String get apiOrigin {
    if (_overrideApiOrigin.isNotEmpty) {
      return _overrideApiOrigin;
    }

    if (kIsWeb || defaultTargetPlatform == TargetPlatform.macOS) {
      return 'http://localhost:3001';
    }

    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:3001';
    }

    return 'http://$_localNetworkHost:3001';
  }

  static List<String> get apiOriginCandidates {
    if (_overrideApiOrigin.isNotEmpty) {
      return [_overrideApiOrigin];
    }

    if (kIsWeb || defaultTargetPlatform == TargetPlatform.macOS) {
      return ['http://localhost:3001'];
    }

    if (defaultTargetPlatform == TargetPlatform.android) {
      return ['http://10.0.2.2:3001', 'http://$_localNetworkHost:3001'];
    }

    return [
      'http://$_bonjourHost:3001',
      ..._recentLocalNetworkHosts.map((host) => 'http://$host:3001'),
    ];
  }

  static String get apiBaseUrl {
    return '$apiOrigin/api';
  }

  static const sessionBox = 'session_box';
  static const syncBox = 'sync_box';
}
