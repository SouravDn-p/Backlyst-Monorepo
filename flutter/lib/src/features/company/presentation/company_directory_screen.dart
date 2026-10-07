import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:gap/gap.dart';
import 'package:backlyst_mobile/src/core/theme/app_colors.dart';
import 'package:backlyst_mobile/src/common_widgets/custom_text_field.dart';
import 'provider_profile_screen.dart';
import 'widgets/provider_card.dart';

class CompanyDirectoryScreen extends StatelessWidget {
  const CompanyDirectoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Mock Data
    final List<Map<String, dynamic>> providers = [
      {
        'name': 'TechCrunch Media',
        'rating': 4.9,
        'reviews': 120,
        'tags': ['Tech', 'News', 'High Traffic'],
      },
      {
        'name': 'Health & Wellness Hub',
        'rating': 4.7,
        'reviews': 85,
        'tags': ['Health', 'Lifestyle'],
      },
      {
        'name': 'Crypto Daily',
        'rating': 4.5,
        'reviews': 210,
        'tags': ['Finance', 'Crypto', 'Invest'],
      },
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Company Directory', style: TextStyle(color: AppColors.textPrimary)),
        leading: const BackButton(color: AppColors.textPrimary),
      ),
      body: Padding(
        padding: EdgeInsets.symmetric(horizontal: 24.w),
        child: Column(
          children: [
            const CustomTextField(
              hintText: 'Search providers...',
              prefixIcon: Icons.search,
            ),
            Gap(24.h),
            Expanded(
              child: ListView.separated(
                itemCount: providers.length,
                separatorBuilder: (context, index) => Gap(16.h),
                itemBuilder: (context, index) {
                  return ProviderCard(
                    provider: providers[index],
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => ProviderProfileScreen(provider: providers[index]),
                        ),
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
