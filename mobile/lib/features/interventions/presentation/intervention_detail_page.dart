import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:signature/signature.dart';
import '../../sync/data/sync_service.dart';
import '../data/interventions_repository.dart';
import '../../../shared/models/intervention_model.dart';
import '../../../shared/widgets/sacoges_logo.dart';
import 'interventions_page.dart';

final interventionDetailProvider = FutureProvider.autoDispose.family<InterventionModel, String>((ref, interventionId) async {
  return ref.watch(interventionsRepositoryProvider).fetchDetail(interventionId);
});

class InterventionDetailPage extends ConsumerStatefulWidget {
  const InterventionDetailPage({super.key, required this.interventionId});

  final String interventionId;

  @override
  ConsumerState<InterventionDetailPage> createState() => _InterventionDetailPageState();
}

class _InterventionDetailPageState extends ConsumerState<InterventionDetailPage> {
  final _formKey = GlobalKey<FormState>();
  final _clientNameController = TextEditingController();
  final _technicianNameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _hoursController = TextEditingController();
  final _machineTypeController = TextEditingController();
  final _clientSignatureController = SignatureController(
    penStrokeWidth: 2.8,
    penColor: const Color(0xFF0F172A),
  );
  final _technicianSignatureController = SignatureController(
    penStrokeWidth: 2.8,
    penColor: const Color(0xFF0F172A),
  );
  bool _warrantyEnabled = false;
  bool _submitting = false;
  late bool _editing;
  String? _existingClientSignatureUrl;
  String? _existingTechnicianSignatureUrl;
  bool _defaultsHydrated = false;

  bool get _isNewForm => widget.interventionId == 'new';
  bool get _isReadOnly => !_isNewForm && !_editing;

  void _goBack() {
    if (context.canPop()) {
      context.pop();
      return;
    }
    context.go('/interventions');
  }

  @override
  void initState() {
    super.initState();
    _editing = _isNewForm;
  }

  InterventionModel? _resolveIntervention(WidgetRef ref) {
    if (!_isNewForm) {
      final detail = ref.watch(interventionDetailProvider(widget.interventionId));
      final detailValue = detail.maybeWhen(data: (value) => value, orElse: () => null);
      if (detailValue != null) {
        return detailValue;
      }
    }

    final asyncValue = ref.watch(interventionsProvider);
    return asyncValue.maybeWhen(
      data: (items) {
        for (final item in items) {
          if (item.id == widget.interventionId) {
            return item;
          }
        }
        return null;
      },
      orElse: () {
        final cached = ref.read(interventionsRepositoryProvider).loadCached();
        for (final item in cached) {
          if (item.id == widget.interventionId) {
            return item;
          }
        }
        return null;
      },
    );
  }

  void _hydrateDefaults(InterventionModel? intervention) {
    if (intervention == null || _defaultsHydrated) {
      return;
    }
    _clientNameController.text = intervention.clientName;
    _technicianNameController.text = intervention.technicianName ?? 'Technicien';
    _descriptionController.text = intervention.description;
    _hoursController.text = intervention.workedHours ?? '';
    _machineTypeController.text = intervention.machineType ?? intervention.siteName;
    _warrantyEnabled = intervention.warrantyEnabled ?? false;
    _existingClientSignatureUrl = intervention.clientSignatureUrl;
    _existingTechnicianSignatureUrl = intervention.technicianSignatureUrl;
    _defaultsHydrated = true;
  }

  Future<String?> _signatureAsImage(SignatureController controller) async {
    final bytes = await controller.toPngBytes();
    if (bytes == null || bytes.isEmpty) {
      return null;
    }
    return 'data:image/png;base64,${base64Encode(bytes)}';
  }

  String _generateTicket() {
    final now = DateTime.now();
    final year = now.year.toString();
    final month = now.month.toString().padLeft(2, '0');
    final day = now.day.toString().padLeft(2, '0');
    final hour = now.hour.toString().padLeft(2, '0');
    final minute = now.minute.toString().padLeft(2, '0');
    return 'INT-$year$month$day-$hour$minute';
  }

  Future<void> _showSuccessPopup({
    required String title,
    required String description,
    required String ticket,
  }) async {
    await showDialog<void>(
      context: context,
      builder: (context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          title: Text(title),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(description),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(
                  'Ticket: $ticket',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
          actions: [
            FilledButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Retour aux interventions'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez remplir tous les champs obligatoires avant de valider.')),
      );
      return;
    }

    final hasClientSignature = _clientSignatureController.isNotEmpty || _existingClientSignatureUrl != null;
    final hasTechnicianSignature =
        _technicianSignatureController.isNotEmpty || _existingTechnicianSignatureUrl != null;

    if (!hasClientSignature || !hasTechnicianSignature) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Les deux signatures sont obligatoires avant validation.')),
      );
      return;
    }

    setState(() => _submitting = true);
    final clientSignature =
        _clientSignatureController.isEmpty ? _existingClientSignatureUrl : await _signatureAsImage(_clientSignatureController);
    final technicianSignature = _technicianSignatureController.isEmpty
        ? _existingTechnicianSignatureUrl
        : await _signatureAsImage(_technicianSignatureController);

    final payload = <String, dynamic>{
      'clientName': _clientNameController.text.trim(),
      'technicianName': _technicianNameController.text.trim(),
      'interventionDescription': _descriptionController.text.trim(),
      'workedHours': _hoursController.text.trim(),
      'warrantyEnabled': _warrantyEnabled,
      'machineType': _machineTypeController.text.trim(),
      'signerName': _clientNameController.text.trim(),
      'signatureUrl': clientSignature,
      'technicianSignatureUrl': technicianSignature,
    };
    if (_isNewForm) {
      payload['date'] = DateTime.now().toIso8601String();
    }
    final intervention = _resolveIntervention(ref);

    try {
      if (_isNewForm) {
        final created = await ref.read(interventionsRepositoryProvider).createIntervention(payload);
        ref.invalidate(interventionsProvider);
        if (mounted) {
          await _showSuccessPopup(
            title: 'Intervention ajoutee',
            description: 'La fiche a ete ajoutee dans la base avec succes.',
            ticket: created.number,
          );
          if (mounted) {
            context.go('/interventions');
          }
        }
      } else {
        await ref.read(syncServiceProvider).submitOrQueue(widget.interventionId, payload);
        ref.invalidate(interventionsProvider);
        ref.invalidate(interventionDetailProvider(widget.interventionId));
        if (mounted) {
          await _showSuccessPopup(
            title: 'Intervention modifiee',
            description: 'Les modifications ont ete enregistrees avec succes.',
            ticket: intervention?.number ?? _generateTicket(),
          );
          if (mounted) {
            context.go('/interventions');
          }
        }
      }
    } catch (error) {
      if (mounted) {
        final message = _buildErrorMessage(error);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(message),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  String _buildErrorMessage(Object error) {
    if (error is DioException) {
      final data = error.response?.data;
      if (data is Map) {
        final backendError = data['error'];
        if (backendError is String && backendError.isNotEmpty) {
          return backendError;
        }
        if (backendError is Map) {
          final nestedMessage = backendError['message'];
          if (nestedMessage is List && nestedMessage.isNotEmpty) {
            return nestedMessage.join('\n');
          }
          if (nestedMessage is String && nestedMessage.isNotEmpty) {
            return nestedMessage;
          }
          final nestedError = backendError['error'];
          if (nestedError is String && nestedError.isNotEmpty) {
            return nestedError;
          }
        }
        final topLevelMessage = data['message'];
        if (topLevelMessage is List && topLevelMessage.isNotEmpty) {
          return topLevelMessage.join('\n');
        }
        if (topLevelMessage is String && topLevelMessage.isNotEmpty) {
          return topLevelMessage;
        }
        final statusCode = data['statusCode'];
        if (statusCode != null) {
          return 'Erreur backend: $statusCode';
        }
      }

      if (error.message != null && error.message!.trim().isNotEmpty) {
        return error.message!.trim();
      }
    }

    return 'La sauvegarde a echoue. Verifiez les champs saisis.';
  }

  @override
  Widget build(BuildContext context) {
    final intervention = _resolveIntervention(ref);
    _hydrateDefaults(intervention);

    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      appBar: AppBar(
        leading: IconButton(
          onPressed: _submitting ? null : _goBack,
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          tooltip: 'Retour',
        ),
        title: const Row(
          children: [
            SacogesLogo(
              size: 34,
              backgroundColor: Colors.transparent,
              padding: 2,
            ),
            SizedBox(width: 10),
            Expanded(child: Text("Fiche D'Intervention")),
          ],
        ),
        backgroundColor: const Color(0xFF4469B5),
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          if (_isNewForm || _editing)
            IconButton(
              onPressed: _submitting ? null : _submit,
              icon: const Icon(Icons.check_rounded, size: 32),
              tooltip: 'Enregistrer',
            )
          else
            IconButton(
              onPressed: _submitting
                  ? null
                  : () {
                      setState(() => _editing = true);
                    },
              icon: const Icon(Icons.edit_rounded),
              tooltip: 'Modifier',
            ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
          children: [
            if (!_isNewForm && intervention != null) ...[
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      intervention.number,
                      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${intervention.status} · ${intervention.siteName}',
                      style: TextStyle(color: Colors.grey.shade700),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      intervention.siteAddress,
                      style: TextStyle(color: Colors.grey.shade600),
                    ),
                    if (_isReadOnly) ...[
                      const SizedBox(height: 14),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: const Text(
                          'Cliquez sur l’icone modifier pour changer cette intervention.',
                          style: TextStyle(
                            color: Color(0xFF142A7B),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 18),
            ],
            _FormSection(
              title: 'Nom et Prenom Client',
              subtitle: '',
              child: Column(
                children: [
                  TextFormField(
                    controller: _clientNameController,
                    readOnly: _isReadOnly,
                    decoration: const InputDecoration(border: OutlineInputBorder()),
                    validator: (value) =>
                        value == null || value.trim().isEmpty ? 'Champ obligatoire' : null,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            _FormSection(
              title: "Nom et Prenom d'intervenant",
              subtitle: '',
              child: Column(
                children: [
                  TextFormField(
                    controller: _technicianNameController,
                    readOnly: _isReadOnly,
                    decoration: const InputDecoration(border: OutlineInputBorder()),
                    validator: (value) =>
                        value == null || value.trim().isEmpty ? 'Champ obligatoire' : null,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            _FormSection(
              title: "Description de l'intervention",
              subtitle: '',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextFormField(
                    controller: _descriptionController,
                    maxLines: 6,
                    readOnly: _isReadOnly,
                    decoration: const InputDecoration(border: OutlineInputBorder()),
                    validator: (value) =>
                        value == null || value.trim().isEmpty ? 'Champ obligatoire' : null,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            _FormSection(
              title: "Nombre d'heure",
              subtitle: '',
              child: Column(
                children: [
                  TextFormField(
                    controller: _hoursController,
                    readOnly: _isReadOnly,
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    decoration: const InputDecoration(border: OutlineInputBorder()),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Champ obligatoire';
                      }
                      if (int.tryParse(value.trim()) == null) {
                        return 'Entrez uniquement des nombres';
                      }
                      return null;
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            _FormSection(
              title: 'Garantie',
              subtitle: '',
              child: SwitchListTile.adaptive(
                value: _warrantyEnabled,
                contentPadding: EdgeInsets.zero,
                activeThumbColor: const Color(0xFF4469B5),
                activeTrackColor: const Color(0xFF4469B5).withValues(alpha: 0.35),
                title: Text(_warrantyEnabled ? 'Sous garantie' : 'Non garantie'),
                onChanged: _isReadOnly ? null : (value) => setState(() => _warrantyEnabled = value),
              ),
            ),
            const SizedBox(height: 16),
            _FormSection(
              title: 'Type de machine',
              subtitle: '',
              child: TextFormField(
                controller: _machineTypeController,
                readOnly: _isReadOnly,
                decoration: const InputDecoration(border: OutlineInputBorder()),
                validator: (value) =>
                    value == null || value.trim().isEmpty ? 'Champ obligatoire' : null,
              ),
            ),
            const SizedBox(height: 16),
            _FormSection(
              title: 'Signature Client',
              subtitle: _isReadOnly
                  ? 'Passez en mode modification pour dessiner ou changer la signature.'
                  : 'Dessinez la signature à la main. Elle sera stockée comme image.',
              child: _SignatureField(
                controller: _clientSignatureController,
                clearLabel: 'Effacer la signature client',
                enabled: !_isReadOnly,
                existingSignatureUrl: _existingClientSignatureUrl,
                showExistingPreview: _isReadOnly,
              ),
            ),
            const SizedBox(height: 16),
            _FormSection(
              title: 'Signature Intervenant',
              subtitle: _isReadOnly
                  ? 'Passez en mode modification pour dessiner ou changer la signature.'
                  : "Dessinez la signature de l'intervenant. Elle sera aussi stockée comme image.",
              child: _SignatureField(
                controller: _technicianSignatureController,
                clearLabel: "Effacer la signature intervenant",
                enabled: !_isReadOnly,
                existingSignatureUrl: _existingTechnicianSignatureUrl,
                showExistingPreview: _isReadOnly,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FormSection extends StatelessWidget {
  const _FormSection({
    required this.title,
    required this.subtitle,
    required this.child,
  });

  final String title;
  final String subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(0),
      decoration: BoxDecoration(
        color: Colors.transparent,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w500,
              color: Color(0xFF142A7B),
            ),
          ),
          if (subtitle.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(subtitle, style: TextStyle(color: Colors.grey.shade600, height: 1.4)),
          ],
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }
}

class _SignatureField extends StatelessWidget {
  const _SignatureField({
    required this.controller,
    required this.clearLabel,
    required this.enabled,
    required this.existingSignatureUrl,
    required this.showExistingPreview,
  });

  final SignatureController controller;
  final String clearLabel;
  final bool enabled;
  final String? existingSignatureUrl;
  final bool showExistingPreview;

  @override
  Widget build(BuildContext context) {
    final existingBytes = _decodeDataUrl(existingSignatureUrl);
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF142A7B), width: 1.8),
      ),
      child: Column(
        children: [
          SizedBox(
            height: 220,
            child: showExistingPreview && existingBytes != null
                ? Padding(
                    padding: const EdgeInsets.all(16),
                    child: Image.memory(existingBytes, fit: BoxFit.contain),
                  )
                : IgnorePointer(
                    ignoring: !enabled,
                    child: Opacity(
                      opacity: enabled ? 1 : 0.55,
                      child: Signature(
                        controller: controller,
                        backgroundColor: Colors.white,
                      ),
                    ),
                  ),
          ),
          if (!showExistingPreview && existingBytes != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Signature existante conservee si vous ne redessinez pas.',
                  style: TextStyle(color: Colors.grey.shade600),
                ),
              ),
            ),
          Container(
            decoration: const BoxDecoration(
              color: Colors.black,
              borderRadius: BorderRadius.vertical(bottom: Radius.circular(18)),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton.icon(
                  onPressed: enabled ? controller.clear : null,
                  icon: const Icon(Icons.clear, color: Colors.white),
                  label: Text(
                    clearLabel,
                    style: const TextStyle(color: Colors.white),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Uint8List? _decodeDataUrl(String? dataUrl) {
    if (dataUrl == null || !dataUrl.startsWith('data:image')) {
      return null;
    }

    final separator = dataUrl.indexOf(',');
    if (separator == -1) {
      return null;
    }

    return base64Decode(dataUrl.substring(separator + 1));
  }
}
