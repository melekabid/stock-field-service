class StockProductModel {
  const StockProductModel({
    required this.id,
    required this.name,
    required this.reference,
    required this.barcode,
    required this.kind,
    required this.category,
    required this.quantity,
    this.warehouseId,
    this.warehouseCode,
    this.warehouseName,
    this.alertThreshold = 0,
    this.description,
  });

  final String id;
  final String name;
  final String reference;
  final String barcode;
  final String kind;
  final String category;
  final int quantity;
  final String? warehouseId;
  final String? warehouseCode;
  final String? warehouseName;
  final int alertThreshold;
  final String? description;

  bool get isLowStock => quantity <= alertThreshold;

  factory StockProductModel.fromJson(Map<String, dynamic> json) => StockProductModel(
        id: json['id'] as String,
        name: json['name'] as String? ?? '',
        reference: json['reference'] as String? ?? '',
        barcode: json['barcode'] as String? ?? '',
        kind: json['kind'] as String? ?? 'CONSUMABLE',
        category: json['category'] as String? ?? '',
        quantity: (json['quantity'] as num?)?.toInt() ?? 0,
        warehouseId: json['warehouseId'] as String?,
        warehouseCode: json['warehouseCode'] as String?,
        warehouseName: json['warehouseName'] as String?,
        alertThreshold: (json['alertThreshold'] as num?)?.toInt() ?? 0,
        description: json['description'] as String?,
      );
}

class StockScanResult {
  const StockScanResult({
    required this.message,
    required this.takenBy,
    required this.productName,
    required this.reference,
    required this.remainingQuantity,
    required this.quantityTaken,
  });

  final String message;
  final String takenBy;
  final String productName;
  final String reference;
  final int remainingQuantity;
  final int quantityTaken;

  factory StockScanResult.fromJson(Map<String, dynamic> json) {
    final product = Map<String, dynamic>.from(json['product'] as Map? ?? const {});

    return StockScanResult(
      message: json['message'] as String? ?? 'Produit retire du stock',
      takenBy: json['takenBy'] as String? ?? '',
      productName: product['name'] as String? ?? '',
      reference: product['reference'] as String? ?? '',
      remainingQuantity: (json['remainingQuantity'] as num?)?.toInt() ?? 0,
      quantityTaken: (json['quantityTaken'] as num?)?.toInt() ?? 1,
    );
  }
}
