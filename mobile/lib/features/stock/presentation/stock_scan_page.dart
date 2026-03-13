import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../../shared/widgets/sacoges_logo.dart';
import '../data/stock_repository.dart';
import 'stocks_page.dart';

class StockScanPage extends ConsumerStatefulWidget {
  const StockScanPage({super.key});

  @override
  ConsumerState<StockScanPage> createState() => _StockScanPageState();
}

class _StockScanPageState extends ConsumerState<StockScanPage> {
  final _manualController = TextEditingController();
  bool _busy = false;
  bool _handledScan = false;

  void _goBack() {
    if (context.canPop()) {
      context.pop();
      return;
    }
    context.go('/stocks');
  }

  Future<void> _submitBarcode(String barcode) async {
    final value = barcode.replaceAll(RegExp(r'\s+'), '').trim();
    if (value.isEmpty || _busy) {
      return;
    }

    setState(() => _busy = true);
    try {
      final result = await ref.read(stockRepositoryProvider).scanBarcode(value);
      ref.invalidate(stockCatalogProvider);
      if (!mounted) {
        return;
      }
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          title: const Text('Produit sorti du stock'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(result.productName, style: const TextStyle(fontWeight: FontWeight.w900)),
              const SizedBox(height: 8),
              Text('Reference : ${result.reference}'),
              Text('Quantite retiree : ${result.quantityTaken}'),
              Text('Stock restant : ${result.remainingQuantity}'),
              Text('Pris par : ${result.takenBy}'),
            ],
          ),
          actions: [
            FilledButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Continuer'),
            ),
          ],
        ),
      );
      if (mounted) {
        context.go('/stocks');
      }
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Scan impossible pour "$value" : ${_extractScanError(error)}')),
      );
    } finally {
      if (mounted) {
        setState(() {
          _busy = false;
          _handledScan = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
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
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
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
                    const SacogesLogo(
                      size: 42,
                      backgroundColor: Colors.transparent,
                      padding: 3,
                    ),
                    const SizedBox(width: 10),
                    const Expanded(
                      child: Text(
                        'Scan code-barres',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 28,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                Container(
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.14),
                    borderRadius: BorderRadius.circular(30),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
                  ),
                  child: const Text(
                    'Scannez un produit pour retirer automatiquement 1 unite du stock et enregistrer la sortie au nom de l’utilisateur connecte.',
                    style: TextStyle(color: Color(0xFFDCE8FF), height: 1.5),
                  ),
                ),
                const SizedBox(height: 18),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.95),
                      borderRadius: BorderRadius.circular(30),
                    ),
                    child: Column(
                      children: [
                        Expanded(
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(24),
                            child: kIsWeb
                                ? _ManualScanFallback(
                                    controller: _manualController,
                                    busy: _busy,
                                    onSubmit: () => _submitBarcode(_manualController.text),
                                  )
                                : MobileScanner(
                                    onDetect: (capture) {
                                      if (_handledScan || _busy) {
                                        return;
                                      }
                                      final barcode = capture.barcodes.first.rawValue;
                                      if (barcode == null || barcode.isEmpty) {
                                        return;
                                      }
                                      _handledScan = true;
                                      _submitBarcode(barcode);
                                    },
                                  ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        TextField(
                          controller: _manualController,
                          decoration: const InputDecoration(
                            labelText: 'Saisie manuelle du code-barres',
                            prefixIcon: Icon(Icons.qr_code_2_rounded),
                          ),
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton.icon(
                            onPressed: _busy ? null : () => _submitBarcode(_manualController.text),
                            style: FilledButton.styleFrom(
                              backgroundColor: const Color(0xFF0F4CC9),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                            ),
                            icon: _busy
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                  )
                                : const Icon(Icons.remove_circle_outline_rounded),
                            label: Text(
                              _busy ? 'Sortie en cours...' : 'Retirer 1 unite du stock',
                              style: const TextStyle(fontWeight: FontWeight.w800),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

String _extractScanError(Object error) {
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
    if (error.type == DioExceptionType.connectionError) {
      return 'backend inaccessible';
    }
    if (error.message != null && error.message!.trim().isNotEmpty) {
      return error.message!.trim();
    }
  }
  return '$error';
}

class _ManualScanFallback extends StatelessWidget {
  const _ManualScanFallback({
    required this.controller,
    required this.busy,
    required this.onSubmit,
  });

  final TextEditingController controller;
  final bool busy;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFFF3F7FF),
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.qr_code_scanner_rounded, size: 56, color: Color(0xFF0F4CC9)),
              const SizedBox(height: 14),
              const Text(
                'Le mode camera est remplace ici par une saisie manuelle.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF102348),
                ),
              ),
              const SizedBox(height: 10),
              const Text(
                'Sur telephone, vous pourrez utiliser la camera pour scanner directement le code-barres.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Color(0xFF5A6E91), height: 1.5),
              ),
              const SizedBox(height: 18),
              SizedBox(
                width: 220,
                child: FilledButton(
                  onPressed: busy ? null : onSubmit,
                  child: const Text('Valider le code'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
