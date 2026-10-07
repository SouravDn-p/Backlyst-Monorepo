import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'core/theme/app_theme.dart';
import 'features/authentication/presentation/splash_screen.dart';
// import 'routing/app_router.dart'; // To be implemented

class App extends StatelessWidget {
  const App({super.key});

  @override
  Widget build(BuildContext context) {
    // Initialize ScreenUtil for responsive design
    return ScreenUtilInit(
      designSize: const Size(393, 852), // iPhone 14 Pro dimensions (from Figma usually)
      minTextAdapt: true,
      splitScreenMode: true,
      builder: (context, child) {
        return MaterialApp(
          debugShowCheckedModeBanner: false,
          title: 'BackLyst',
          theme: AppTheme.lightTheme,
          // darkTheme: AppTheme.darkTheme, // Optional
          // routerConfig: goRouter, // To be implemented
          home: const SplashScreen(),
        );
      },
    );
  }
}
