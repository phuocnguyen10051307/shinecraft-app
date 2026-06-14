# ShineCraft App

## Kết nối API mobile

App mặc định gọi `http://10.0.2.2:3000/api` trên Android emulator và
`http://localhost:3000/api` trên iOS simulator/web.

Khi chạy trên điện thoại thật, tạo `.env` từ `.env.example`, thay IP bằng địa chỉ LAN của máy chạy
`shinecraft-server`, và bảo đảm hai thiết bị dùng cùng mạng Wi-Fi:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:3000/api
```

Token được lưu bằng `expo-secure-store`. Khi mở app hoặc đưa app về foreground, `/auth/me` được gọi
để kiểm tra phiên; token hết hạn hoặc không hợp lệ sẽ bị xóa và app quay về màn hình đăng nhập.

Ứng dụng đa nền tảng được xây dựng bằng Expo SDK 56, React Native và
TypeScript. Dự án sử dụng Expo Router để quản lý điều hướng theo cấu trúc
file, đồng thời tổ chức mã nguồn theo từng tính năng để dễ phát triển, kiểm
thử và bảo trì khi ứng dụng mở rộng.

## Công nghệ chính

- Expo SDK 56
- React Native 0.85
- React 19
- Expo Router
- TypeScript
- React Native Reanimated
- React Native Screens
- React Native Safe Area Context

Theo tài liệu Expo SDK 56, môi trường phát triển nên sử dụng Node.js
22.13.x trở lên trong nhánh Node.js 22.

## Yêu cầu môi trường

Trước khi chạy dự án, cần chuẩn bị:

- Node.js 22.13.x hoặc phiên bản tương thích
- npm
- Expo Go hoặc development build trên thiết bị thật
- Android Studio nếu chạy Android Emulator
- Xcode nếu chạy iOS Simulator; Xcode chỉ có trên macOS

Kiểm tra phiên bản Node.js và npm:

```bash
node --version
npm --version
```

## Cài đặt

Tại thư mục gốc của dự án, cài đặt các dependency:

```bash
npm install
```

Sau đó khởi động Expo development server:

```bash
npm start
```

Khi Metro Bundler đã chạy, có thể quét mã QR bằng Expo Go hoặc chọn nền
tảng muốn mở.

## Các lệnh thường dùng

```bash
# Khởi động Expo development server
npm start

# Chạy ứng dụng trên Android
npm run android

# Chạy ứng dụng trên iOS
npm run ios

# Chạy phiên bản web
npm run web

# Kiểm tra lint
npm run lint
```

Lệnh `npm run ios` yêu cầu máy macOS có Xcode. Android có thể chạy bằng
thiết bị thật hoặc Android Emulator.

## Cấu trúc dự án

```text
shinecraft-app/
|-- assets/                     # Tài nguyên tĩnh của ứng dụng
|   |-- expo.icon/              # Cấu hình và tài nguyên icon của Expo
|   |-- fonts/                  # Font chữ
|   |-- icons/                  # Icon dùng trong ứng dụng
|   `-- images/                 # Hình ảnh, splash, favicon và tab icon
|-- scripts/                    # Script hỗ trợ quá trình phát triển
|-- src/                        # Toàn bộ mã nguồn chính
|   |-- app/                    # Route và route layout của Expo Router
|   |-- components/             # Component dùng chung toàn ứng dụng
|   |-- constants/              # Hằng số dùng chung
|   |-- features/               # Mã nguồn được chia theo tính năng
|   |   |-- admin/
|   |   |-- auth/
|   |   |-- customers/
|   |   |-- home/
|   |   `-- staff/
|   |-- hooks/                  # Custom hook dùng chung
|   |-- layouts/                # Layout giao diện không phải route
|   |-- lib/                    # Cấu hình thư viện và dịch vụ bên ngoài
|   |-- store/                  # Quản lý trạng thái toàn cục
|   |-- theme/                  # Màu sắc, spacing, typography và theme
|   |-- types/                  # Type và interface dùng chung
|   `-- global.css              # CSS toàn cục cho nền tảng web
|-- app.json                    # Cấu hình Expo
|-- package.json                # Dependency và npm script
`-- tsconfig.json               # Cấu hình TypeScript và path alias
```

Thư mục `android/` và `ios/` chưa được lưu trong Git vì đây là các thư mục
native có thể được Expo tạo tự động khi chạy prebuild. Chỉ tạo hoặc chỉnh
sửa chúng khi dự án thực sự cần cấu hình native riêng.

## Chi tiết thư mục mã nguồn

### `src/app`

Đây là thư mục đặc biệt của Expo Router. Mỗi file trong thư mục này có thể
trở thành một route của ứng dụng.

Các file hiện tại:

- `_layout.tsx`: layout gốc, cấu hình theme và navigation chung.
- `index.tsx`: màn hình tại route `/`.
- `explore.tsx`: màn hình tại route `/explore`.

Không đặt component, hook hoặc tiện ích thông thường trong `src/app`, vì
Expo Router có thể xem chúng là một phần của hệ thống route.

Dự án không cần `App.tsx`. Điểm khởi chạy được khai báo trong
`package.json` là:

```json
{
  "main": "expo-router/entry"
}
```

### `src/components`

Chứa các component có thể tái sử dụng ở nhiều tính năng, ví dụ:

- Button, Input, Modal
- Text và View đã áp dụng theme
- Loading indicator
- Empty state
- Component điều hướng dùng chung

Component chỉ phục vụ một feature nên được đặt trong thư mục
`components` của feature đó.

### `src/features`

Mỗi nghiệp vụ lớn được tách thành một feature độc lập:

```text
feature-name/
|-- components/                 # Component chỉ dùng trong feature
|-- screens/                    # Phần triển khai giao diện màn hình
`-- hooks/                      # Hook và logic riêng của feature
```

Các feature được chuẩn bị:

- `auth`: đăng nhập, đăng xuất và xác thực người dùng.
- `admin`: chức năng dành cho quản trị viên.
- `customers`: quản lý và hiển thị thông tin khách hàng.
- `home`: nội dung của màn hình chính.
- `staff`: quản lý nhân viên và nghiệp vụ liên quan.

File route trong `src/app` nên giữ gọn. Route chịu trách nhiệm nhận tham
số điều hướng và gọi screen tương ứng từ `src/features`.

Ví dụ:

```tsx
import { HomeScreen } from '@/features/home/screens/home-screen';

export default function HomeRoute() {
  return <HomeScreen />;
}
```

### `src/hooks`

Chứa custom hook dùng ở nhiều feature, ví dụ `useAuth`, `useTheme` hoặc
`useDebounce`. Hook chỉ dùng trong một nghiệp vụ nên đặt tại
`src/features/<feature>/hooks`.

### `src/layouts`

Chứa các component bố cục dùng chung như `AuthLayout` hoặc
`DashboardLayout`. Layout định nghĩa route của Expo Router vẫn phải dùng
file `_layout.tsx` trong `src/app`.

### `src/lib`

Chứa phần khởi tạo và cấu hình các dịch vụ bên ngoài, ví dụ:

- API client
- Axios
- Firebase
- Supabase
- Secure Store
- Analytics

Không nên đặt component giao diện hoặc logic màn hình trong thư mục này.

### `src/store`

Chứa state toàn cục và logic quản lý state khi dự án sử dụng Zustand,
Redux Toolkit hoặc giải pháp tương tự. State cục bộ của một màn hình vẫn
nên đặt gần component sử dụng nó.

### `src/types`

Chứa type và interface được sử dụng ở nhiều khu vực, chẳng hạn model API,
kiểu dữ liệu người dùng và kiểu tham số điều hướng. Type chỉ dùng trong
một feature có thể đặt ngay trong feature đó.

### `src/theme`

Quản lý hệ thống thiết kế chung:

- Bảng màu sáng và tối
- Spacing
- Kích thước và kiểu chữ
- Border radius
- Shadow
- Cấu hình theme cho navigation

## Quy ước import

Dự án đã cấu hình alias `@/` trỏ đến thư mục `src`:

```tsx
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
```

Tài nguyên trong `assets` có thể được truy cập bằng alias `@/assets`:

```tsx
const logo = require('@/assets/images/icon.png');
```

Ưu tiên alias thay cho các đường dẫn tương đối dài như
`../../../components`.

## Quy trình thêm tính năng mới

Ví dụ khi thêm feature `appointments`:

1. Tạo `src/features/appointments`.
2. Tạo các thư mục `components`, `screens` và `hooks` khi cần.
3. Viết screen chính trong `screens`.
4. Tạo file route tương ứng trong `src/app`.
5. Đặt type dùng riêng trong feature; chỉ chuyển vào `src/types` khi type
   được dùng ở nhiều feature.
6. Chạy lint và kiểm tra ứng dụng trên nền tảng mục tiêu.

Không cần tạo đầy đủ mọi file ngay từ đầu. Chỉ bổ sung thành phần khi
feature thực sự sử dụng để tránh cấu trúc rỗng và khó theo dõi.

## Cấu hình Expo

Cấu hình ứng dụng nằm trong `app.json`, bao gồm:

- Tên và slug của ứng dụng
- Icon và splash screen
- URL scheme
- Cấu hình Android, iOS và web
- Expo Router plugin
- Typed routes
- React Compiler

Khi cài package thuộc Expo SDK, sử dụng:

```bash
npx expo install <package-name>
```

Lệnh này giúp chọn phiên bản package tương thích với Expo SDK đang dùng,
thay vì cài tùy ý bằng `npm install`.

## Tài liệu tham khảo

- [Tài liệu Expo SDK 56](https://docs.expo.dev/versions/v56.0.0/)
- [Expo Router](https://docs.expo.dev/versions/v56.0.0/router/introduction/)
- [Cấu hình ứng dụng Expo](https://docs.expo.dev/versions/v56.0.0/config/app/)
- [React Native](https://reactnative.dev/)
