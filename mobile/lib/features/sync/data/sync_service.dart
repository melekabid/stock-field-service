import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../../../core/constants/app_constants.dart';
import '../../interventions/data/interventions_repository.dart';

final syncServiceProvider = Provider<SyncService>((ref) {
  return SyncService(ref.watch(interventionsRepositoryProvider));
});

class SyncService {
  SyncService(this._repository);

  final InterventionsRepository _repository;

  Future<void> submitOrQueue(String interventionId, Map<String, dynamic> payload) async {
    final connectivity = await Connectivity().checkConnectivity();
    if (connectivity.contains(ConnectivityResult.none)) {
      _repository.queueOfflineSubmission(interventionId, payload);
      return;
    }
    await _repository.submitCompletion(interventionId, payload);
  }

  Future<void> flushQueue() async {
    final box = Hive.box(AppConstants.syncBox);
    final queue = List<Map<String, dynamic>>.from((box.get('queue') as List?) ?? []);
    if (queue.isEmpty) {
      return;
    }

    final remaining = <Map<String, dynamic>>[];
    for (final item in queue) {
      try {
        await _repository.submitCompletion(
          item['interventionId'] as String,
          Map<String, dynamic>.from(item['payload'] as Map),
        );
      } catch (_) {
        remaining.add(item);
      }
    }

    box.put('queue', remaining);
  }
}
