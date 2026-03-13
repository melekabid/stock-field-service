import 'package:flutter/material.dart';

class SacogesLogo extends StatelessWidget {
  const SacogesLogo({
    super.key,
    this.size = 60,
    this.backgroundColor,
    this.padding = 6,
  });

  final double size;
  final Color? backgroundColor;
  final double padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      padding: EdgeInsets.all(padding),
      decoration: BoxDecoration(
        color: backgroundColor ?? Colors.white.withValues(alpha: 0.12),
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white.withValues(alpha: 0.22)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x22091F4F),
            blurRadius: 18,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: ClipOval(
        child: Image.asset(
          'assets/branding/sacoges_logo.png',
          fit: BoxFit.cover,
        ),
      ),
    );
  }
}
