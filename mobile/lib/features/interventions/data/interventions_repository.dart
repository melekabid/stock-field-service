import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../shared/models/intervention_model.dart';

final interventionsRepositoryProvider = Provider<InterventionsRepository>((ref) {
  return InterventionsRepository(ref.watch(apiClientProvider));
});

class InterventionsRepository {
  InterventionsRepository(this._client);

  final dynamic _client;

  Future<List<InterventionModel>> fetchAssigned() async {
    final response = await _client.get('/interventions');
    final remoteList = _decodeInterventions(response.data);
    final list = _mergeInterventions(remoteList, _loadLocalDrafts());

    Hive.box(AppConstants.syncBox).put(
      'cached_interventions',
      jsonEncode(list.map((item) => _toCacheJson(item)).toList()),
    );
    return list;
  }

  List<InterventionModel> loadCached() {
    final raw = Hive.box(AppConstants.syncBox).get('cached_interventions') as String?;
    if (raw == null) {
      return [];
    }
    return _decodeInterventions(jsonDecode(raw));
  }

  Future<InterventionModel> createIntervention(Map<String, dynamic> payload) async {
    final response = await _client.post('/interventions', data: payload);
    final intervention = InterventionModel.fromJson(Map<String, dynamic>.from(response.data as Map));

    final cached = loadCached();
    final merged = _mergeInterventions(cached, [intervention]);
    await Hive.box(AppConstants.syncBox).put(
      'cached_interventions',
      jsonEncode(merged.map((item) => _toCacheJson(item)).toList()),
    );

    return intervention;
  }

  Future<InterventionModel> fetchDetail(String interventionId) async {
    final response = await _client.get('/interventions/$interventionId');
    return InterventionModel.fromJson(Map<String, dynamic>.from(response.data as Map));
  }

  Future<void> saveLocalDraft(InterventionModel intervention) async {
    final box = Hive.box(AppConstants.syncBox);
    final drafts = _loadLocalDrafts();
    final merged = _mergeInterventions([intervention], drafts);

    await box.put(
      'draft_interventions',
      jsonEncode(merged.map((item) => _toCacheJson(item)).toList()),
    );

    final cached = loadCached();
    await box.put(
      'cached_interventions',
      jsonEncode(_mergeInterventions(cached, [intervention]).map((item) => _toCacheJson(item)).toList()),
    );
  }

  Future<void> submitCompletion(String interventionId, Map<String, dynamic> payload) async {
    await _client.post('/interventions/$interventionId/complete', data: payload);
  }

  Future<String> generatePdf(String interventionId) async {
    final response = await _client.post('/reports/interventions/$interventionId/pdf');
    final pdfUrl = (response.data as Map)['pdfUrl'] as String;
    if (pdfUrl.startsWith('http')) {
      return pdfUrl;
    }
    return '${AppConstants.apiOrigin}$pdfUrl';
  }

  void queueOfflineSubmission(String interventionId, Map<String, dynamic> payload) {
    final box = Hive.box(AppConstants.syncBox);
    final queue = List<Map<String, dynamic>>.from((box.get('queue') as List?) ?? []);
    queue.add({'interventionId': interventionId, 'payload': payload});
    box.put('queue', queue);
  }

  List<InterventionModel> _loadLocalDrafts() {
    final raw = Hive.box(AppConstants.syncBox).get('draft_interventions') as String?;
    if (raw == null) {
      return [];
    }
    return _decodeInterventions(jsonDecode(raw));
  }

  List<InterventionModel> _decodeInterventions(dynamic raw) {
    if (raw is! List) {
      return [];
    }

    final items = <InterventionModel>[];
    for (final item in raw) {
      try {
        items.add(InterventionModel.fromJson(Map<String, dynamic>.from(item as Map)));
      } catch (_) {
        // Ignore malformed cached entries instead of breaking the whole screen.
      }
    }
    return items;
  }

  List<InterventionModel> _mergeInterventions(
    List<InterventionModel> primary,
    List<InterventionModel> secondary,
  ) {
    final merged = <String, InterventionModel>{};
    for (final item in secondary) {
      merged[item.id] = item;
    }
    for (final item in primary) {
      merged[item.id] = item;
    }
    return merged.values.toList()
      ..sort((a, b) => b.date.compareTo(a.date));
  }

  Map<String, dynamic> _toCacheJson(InterventionModel item) {
    return {
      'id': item.id,
      'number': item.number,
      'status': item.status,
      'description': item.description,
      'client': {
        'name': item.clientName,
      },
      'site': {
        'name': item.siteName,
        'address': item.siteAddress,
      },
      'date': item.date.toIso8601String(),
    };
  }
}
