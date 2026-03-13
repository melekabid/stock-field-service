import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../shared/widgets/sacoges_logo.dart';
import '../data/stock_repository.dart';
import '../models/incoming_stock_model.dart';

final incomingStockProvider = FutureProvider<List<IncomingStockModel>>((ref) async {
  return ref.watch(stockRepositoryProvider).fetchIncomingStock();
});

final incomingProductOptionsProvider = FutureProvider<List<ProductOptionModel>>((ref) async {
  return ref.watch(stockRepositoryProvider).fetchProducts();
});

final incomingWarehouseOptionsProvider = FutureProvider<List<WarehouseOptionModel>>((ref) async {
  return ref.watch(stockRepositoryProvider).fetchWarehouses();
});

class IncomingStockPage extends ConsumerStatefulWidget {
  const IncomingStockPage({super.key});

  @override
  ConsumerState<IncomingStockPage> createState() => _IncomingStockPageState();
}

class _IncomingStockPageState extends ConsumerState<IncomingStockPage> {
  final _searchController = TextEditingController();

  void _goBack() {
    if (context.canPop()) {
      context.pop();
      return;
    }
    context.go('/home');
  }

  Future<void> _refreshAll() async {
    ref.invalidate(incomingStockProvider);
    ref.invalidate(incomingProductOptionsProvider);
    ref.invalidate(incomingWarehouseOptionsProvider);
    await ref.read(incomingStockProvider.future);
  }

  Future<void> _openForm({IncomingStockModel? entry}) async {
    final products = await ref.read(incomingProductOptionsProvider.future);
    final warehouses = await ref.read(incomingWarehouseOptionsProvider.future);
    if (!mounted) {
      return;
    }

    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _IncomingFormSheet(
        entry: entry,
        products: products,
        warehouses: warehouses,
      ),
    );

    if (result == true) {
      await _refreshAll();
    }
  }

  Future<void> _receive(IncomingStockModel entry) async {
    try {
      await ref.read(stockRepositoryProvider).receiveIncoming(entry.id);
      await _refreshAll();
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${entry.productName} a ete ajoute au stock.')),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_extractErrorMessage(error, "Impossible de valider l'arrivee."))),
      );
    }
  }

  Future<void> _delete(IncomingStockModel entry) async {
    final confirmed = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Supprimer la commande'),
            content: Text('Voulez-vous supprimer ${entry.productName} de la liste des arrivages ?'),
            actions: [
              TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Annuler')),
              FilledButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Supprimer')),
            ],
          ),
        ) ??
        false;

    if (!confirmed) {
      return;
    }

    try {
      await ref.read(stockRepositoryProvider).deleteIncoming(entry.id);
      await _refreshAll();
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${entry.productName} a ete supprime de la liste.')),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_extractErrorMessage(error, 'Suppression impossible.'))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final incomingAsync = ref.watch(incomingStockProvider);

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF061C4A),
              Color(0xFF0F4CC9),
              Color(0xFFEAF2FF),
            ],
            stops: [0, 0.44, 1],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
                child: Row(
                  children: [
                    IconButton.filledTonal(
                      onPressed: _goBack,
                      style: IconButton.styleFrom(
                        backgroundColor: Colors.white.withValues(alpha: 0.16),
                        foregroundColor: Colors.white,
                      ),
                      icon: const Icon(Icons.arrow_back_rounded),
                    ),
                    const SizedBox(width: 12),
                    const SacogesLogo(size: 42, backgroundColor: Colors.transparent, padding: 3),
                    const SizedBox(width: 10),
                    const Expanded(
                      child: Text(
                        "Produits commandes\nen attente d'arrivee",
                        style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900),
                      ),
                    ),
                    FilledButton.icon(
                      onPressed: () => _openForm(),
                      style: FilledButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: const Color(0xFF0F4CC9),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                      ),
                      icon: const Icon(Icons.add_rounded),
                      label: const Text('Ajouter'),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: incomingAsync.when(
                  loading: () => const Center(child: CircularProgressIndicator(color: Colors.white)),
                  error: (error, _) => Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: _InfoCard(
                        child: Text(
                          _extractErrorMessage(error, "Impossible de charger les commandes d'arrivee."),
                          style: const TextStyle(color: Color(0xFF14305D), fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                  ),
                  data: (items) {
                    final query = _searchController.text.trim().toLowerCase();
                    final filtered = items.where((item) {
                      return [
                        item.productName,
                        item.productCode,
                        item.productBarcode,
                        item.categoryName,
                        item.warehouseName,
                        item.status,
                      ].join(' ').toLowerCase().contains(query);
                    }).toList();

                    final orderedCount = items.where((item) => !item.isReceived).length;
                    final receivedCount = items.where((item) => item.isReceived).length;

                    return RefreshIndicator(
                      onRefresh: _refreshAll,
                      child: ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
                        children: [
                          _InfoCard(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Approvisionnement mobile',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 22,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                const Text(
                                  "Retrouvez ici le meme tableau que sur le web pour suivre les produits commandes, modifier les lignes, les supprimer ou cliquer sur la coche quand ils arrivent au depot.",
                                  style: TextStyle(color: Color(0xFFDCE8FF), height: 1.5),
                                ),
                                const SizedBox(height: 18),
                                Wrap(
                                  spacing: 12,
                                  runSpacing: 12,
                                  children: [
                                    _StatPill(label: 'En attente', value: '$orderedCount'),
                                    _StatPill(label: 'Arrives', value: '$receivedCount'),
                                    _StatPill(label: 'Total lignes', value: '${items.length}'),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 18),
                          TextField(
                            controller: _searchController,
                            onChanged: (_) => setState(() {}),
                            decoration: const InputDecoration(
                              labelText: "Recherche produit, code, depot ou statut",
                              prefixIcon: Icon(Icons.search_rounded),
                            ),
                          ),
                          const SizedBox(height: 18),
                          _IncomingTableCard(
                            items: filtered,
                            onEdit: (entry) => _openForm(entry: entry),
                            onDelete: _delete,
                            onReceive: _receive,
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _IncomingTableCard extends StatelessWidget {
  const _IncomingTableCard({
    required this.items,
    required this.onEdit,
    required this.onDelete,
    required this.onReceive,
  });

  final List<IncomingStockModel> items;
  final ValueChanged<IncomingStockModel> onEdit;
  final ValueChanged<IncomingStockModel> onDelete;
  final ValueChanged<IncomingStockModel> onReceive;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.96),
        borderRadius: BorderRadius.circular(30),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(30),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: DataTable(
            headingRowColor: WidgetStateProperty.all(const Color(0xFFF1F6FF)),
            columns: const [
              DataColumn(label: Text('Produit')),
              DataColumn(label: Text('Categorie')),
              DataColumn(label: Text('Quantite')),
              DataColumn(label: Text('Depot')),
              DataColumn(label: Text('Arrivee')),
              DataColumn(label: Text('Statut')),
              DataColumn(label: Text('Actions')),
            ],
            rows: items.isEmpty
                ? [
                    const DataRow(
                      cells: [
                        DataCell(Text('Aucune ligne')),
                        DataCell(Text('-')),
                        DataCell(Text('-')),
                        DataCell(Text('-')),
                        DataCell(Text('-')),
                        DataCell(Text('-')),
                        DataCell(Text('-')),
                      ],
                    ),
                  ]
                : items.map((item) {
                    return DataRow(
                      cells: [
                        DataCell(
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(item.productName, style: const TextStyle(fontWeight: FontWeight.w800)),
                              Text(item.productCode, style: const TextStyle(fontSize: 12, color: Color(0xFF6B7B9A))),
                            ],
                          ),
                        ),
                        DataCell(Text(item.categoryName)),
                        DataCell(Text('${item.quantity}')),
                        DataCell(Text(item.warehouseName)),
                        DataCell(Text(_formatDate(item.expectedAt))),
                        DataCell(
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: item.isReceived ? const Color(0xFFE7FFF1) : const Color(0xFFFFF4DB),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(
                              item.isReceived ? 'Arrive' : 'Commande',
                              style: TextStyle(
                                color: item.isReceived ? const Color(0xFF197A48) : const Color(0xFF9A6500),
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ),
                        DataCell(
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (!item.isReceived)
                                IconButton(
                                  tooltip: 'Produit arrive',
                                  onPressed: () => onReceive(item),
                                  icon: const Icon(Icons.check_circle_rounded, color: Color(0xFF1C9A62)),
                                ),
                              IconButton(
                                tooltip: 'Modifier',
                                onPressed: item.isReceived ? null : () => onEdit(item),
                                icon: const Icon(Icons.edit_rounded, color: Color(0xFF0F4CC9)),
                              ),
                              IconButton(
                                tooltip: 'Supprimer',
                                onPressed: item.isReceived ? null : () => onDelete(item),
                                icon: const Icon(Icons.delete_outline_rounded, color: Color(0xFFD53C3C)),
                              ),
                            ],
                          ),
                        ),
                      ],
                    );
                  }).toList(),
          ),
        ),
      ),
    );
  }
}

class _IncomingFormSheet extends ConsumerStatefulWidget {
  const _IncomingFormSheet({
    required this.products,
    required this.warehouses,
    this.entry,
  });

  final IncomingStockModel? entry;
  final List<ProductOptionModel> products;
  final List<WarehouseOptionModel> warehouses;

  @override
  ConsumerState<_IncomingFormSheet> createState() => _IncomingFormSheetState();
}

class _IncomingFormSheetState extends ConsumerState<_IncomingFormSheet> {
  late final TextEditingController _quantityController;
  late final TextEditingController _notesController;
  late DateTime _expectedAt;
  late String _productId;
  late String _warehouseId;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _quantityController = TextEditingController(text: '${widget.entry?.quantity ?? 1}');
    _notesController = TextEditingController(text: widget.entry?.notes ?? '');
    _expectedAt = widget.entry?.expectedAt ?? DateTime.now();
    _productId = widget.entry?.productId ?? (widget.products.isNotEmpty ? widget.products.first.id : '');
    _warehouseId = widget.entry?.warehouseId ?? (widget.warehouses.isNotEmpty ? widget.warehouses.first.id : '');
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _expectedAt,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 3650)),
    );
    if (picked != null) {
      setState(() => _expectedAt = picked);
    }
  }

  Future<void> _save() async {
    final quantity = int.tryParse(_quantityController.text.trim());
    if (_productId.isEmpty || _warehouseId.isEmpty || quantity == null || quantity < 1) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Produit, depot et quantite valide sont obligatoires.')),
      );
      return;
    }

    setState(() => _saving = true);
    try {
      if (widget.entry == null) {
        await ref.read(stockRepositoryProvider).createIncoming(
              productId: _productId,
              warehouseId: _warehouseId,
              quantity: quantity,
              expectedAt: _expectedAt,
              notes: _notesController.text,
            );
      } else {
        await ref.read(stockRepositoryProvider).updateIncoming(
              id: widget.entry!.id,
              productId: _productId,
              warehouseId: _warehouseId,
              quantity: quantity,
              expectedAt: _expectedAt,
              notes: _notesController.text,
            );
      }
      if (!mounted) {
        return;
      }
      Navigator.of(context).pop(true);
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_extractErrorMessage(error, "Impossible d'enregistrer la commande."))),
      );
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        decoration: const BoxDecoration(
          color: Color(0xFFF7FAFF),
          borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 28),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 48,
                  height: 5,
                  decoration: BoxDecoration(
                    color: const Color(0xFFC7D7F8),
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Text(
                widget.entry == null ? 'Nouvelle commande d\'arrivee' : 'Modifier la commande',
                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Color(0xFF102348)),
              ),
              const SizedBox(height: 18),
              DropdownButtonFormField<String>(
                initialValue: _productId.isEmpty ? null : _productId,
                items: widget.products
                    .map(
                      (product) => DropdownMenuItem(
                        value: product.id,
                        child: Text('${product.code} - ${product.name}'),
                      ),
                    )
                    .toList(),
                onChanged: (value) => setState(() => _productId = value ?? ''),
                decoration: const InputDecoration(labelText: 'Produit'),
              ),
              const SizedBox(height: 14),
              DropdownButtonFormField<String>(
                initialValue: _warehouseId.isEmpty ? null : _warehouseId,
                items: widget.warehouses
                    .map(
                      (warehouse) => DropdownMenuItem(
                        value: warehouse.id,
                        child: Text('${warehouse.code} - ${warehouse.name}'),
                      ),
                    )
                    .toList(),
                onChanged: (value) => setState(() => _warehouseId = value ?? ''),
                decoration: const InputDecoration(labelText: 'Depot'),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _quantityController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Quantite'),
              ),
              const SizedBox(height: 14),
              InkWell(
                onTap: _pickDate,
                borderRadius: BorderRadius.circular(18),
                child: InputDecorator(
                  decoration: const InputDecoration(
                    labelText: "Date d'arrivee prevue",
                    prefixIcon: Icon(Icons.event_rounded),
                  ),
                  child: Text(_formatDate(_expectedAt)),
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _notesController,
                maxLines: 4,
                decoration: const InputDecoration(labelText: 'Notes'),
              ),
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _saving ? null : _save,
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF0F4CC9),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  icon: _saving
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.save_rounded),
                  label: Text(_saving ? 'Enregistrement...' : 'Enregistrer'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(30),
        color: Colors.white.withValues(alpha: 0.14),
        border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
      ),
      child: child,
    );
  }
}

class _StatPill extends StatelessWidget {
  const _StatPill({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: Color(0xFFDCE8FF), fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900)),
        ],
      ),
    );
  }
}

String _formatDate(DateTime value) {
  final day = value.day.toString().padLeft(2, '0');
  final month = value.month.toString().padLeft(2, '0');
  return '$day/$month/${value.year}';
}

String _extractErrorMessage(Object error, String fallback) {
  if (error is DioException) {
    final data = error.response?.data;
    if (data is Map<String, dynamic>) {
      final message = data['message'];
      if (message is String && message.isNotEmpty) {
        return message;
      }
      if (message is List && message.isNotEmpty) {
        return message.join('\n');
      }
    }
  }
  return fallback;
}
