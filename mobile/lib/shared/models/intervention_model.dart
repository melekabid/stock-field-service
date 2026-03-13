class InterventionModel {
  InterventionModel({
    required this.id,
    required this.number,
    required this.status,
    required this.description,
    required this.clientName,
    required this.siteName,
    required this.siteAddress,
    required this.date,
    this.notes,
    this.technicianName,
    this.workedHours,
    this.machineType,
    this.warrantyEnabled,
    this.clientSignatureUrl,
    this.technicianSignatureUrl,
  });

  final String id;
  final String number;
  final String status;
  final String description;
  final String clientName;
  final String siteName;
  final String siteAddress;
  final DateTime date;
  final String? notes;
  final String? technicianName;
  final String? workedHours;
  final String? machineType;
  final bool? warrantyEnabled;
  final String? clientSignatureUrl;
  final String? technicianSignatureUrl;

  factory InterventionModel.fromJson(Map<String, dynamic> json) => InterventionModel(
        id: json['id'] as String,
        number: (json['number'] as String?) ?? 'Sans ticket',
        status: (json['status'] as String?) ?? 'OPEN',
        description: (json['description'] as String?) ?? '',
        clientName: _extractValue(json['notes'] as String?, 'Client') ??
            ((json['client'] as Map?)?['name'] as String?) ??
            'Client inconnu',
        siteName: ((json['site'] as Map?)?['name'] as String?) ?? 'Site inconnu',
        siteAddress: ((json['site'] as Map?)?['address'] as String?) ?? '',
        date: _parseDate(json['date']),
        notes: json['notes'] as String?,
        technicianName: _extractValue(json['notes'] as String?, 'Intervenant'),
        workedHours: _extractValue(json['notes'] as String?, "Nombre d'heure"),
        machineType: _extractValue(json['notes'] as String?, 'Type de machine'),
        warrantyEnabled: _extractWarranty(json['notes'] as String?),
        clientSignatureUrl: (json['signature'] as Map?)?['url'] as String?,
        technicianSignatureUrl: _extractTechnicianSignature(json['photos']),
      );

  static DateTime _parseDate(dynamic raw) {
    if (raw is String) {
      return DateTime.tryParse(raw) ?? DateTime.fromMillisecondsSinceEpoch(0);
    }
    return DateTime.fromMillisecondsSinceEpoch(0);
  }

  static String? _extractValue(String? notes, String label) {
    if (notes == null) {
      return null;
    }

    for (final line in notes.split('\n')) {
      final prefix = '$label: ';
      if (line.startsWith(prefix)) {
        return line.substring(prefix.length).trim();
      }
    }

    return null;
  }

  static bool? _extractWarranty(String? notes) {
    final value = _extractValue(notes, 'Garantie');
    if (value == null) {
      return null;
    }
    return value == 'Sous garantie';
  }

  static String? _extractTechnicianSignature(dynamic photos) {
    if (photos is! List) {
      return null;
    }

    for (final item in photos) {
      if (item is Map && item['url'] is String) {
        return item['url'] as String;
      }
    }

    return null;
  }
}
