import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormField } from '@/components/form-field';
import type { Vehicle, VehicleInput } from '@/types';
import {
  carBrands,
  carModelsByBrand,
  popularCarBrands,
} from '@/features/vehicles/data/car-catalog';

import { vehicleStyles } from './vehicle-styles';

const currentYear = new Date().getFullYear();
const productionYears = Array.from({ length: currentYear - 1900 + 1 }, (_, index) => currentYear - index);
const maxVehicleImages = 10;

type SelectionOption = {
  label: string;
  value: string;
};

type SelectionSection = {
  title?: string;
  options: SelectionOption[];
};

export function VehicleModal({
  visible,
  editing,
  form,
  saving,
  setForm,
  onClose,
  onSave,
}: {
  visible: boolean;
  editing: Vehicle | null;
  form: VehicleInput;
  saving: boolean;
  setForm: Dispatch<SetStateAction<VehicleInput>>;
  onClose: () => void;
  onSave: () => void;
}) {
  const [brandPickerVisible, setBrandPickerVisible] = useState(false);
  const [modelPickerVisible, setModelPickerVisible] = useState(false);
  const [yearPickerVisible, setYearPickerVisible] = useState(false);

  const modelOptions = useMemo(() => (form.brand ? (carModelsByBrand[form.brand] ?? []) : []), [form.brand]);
  const selectedImages = form.images ?? [];

  useEffect(() => {
    if (!form.brand) return;
    if (!modelOptions.length) return;
    if (form.model && !modelOptions.includes(form.model)) {
      setForm((current) => ({ ...current, model: '', images: current.images ?? [] }));
    }
  }, [form.brand, form.model, modelOptions, setForm]);

  const update = (key: keyof VehicleInput) => (value: string) =>
    setForm((current) => ({
      ...current,
      [key]: key === 'year' ? Number(value.replace(/\D/g, '')) || 0 : value,
    }));

  const updateImages = (images: NonNullable<VehicleInput['images']>) => {
    setForm((current) => ({ ...current, images }));
  };

  const selectBrand = (brand: string) => {
    setForm((current) => ({
      ...current,
      brand,
      model: carModelsByBrand[brand]?.includes(current.model) ? current.model : '',
    }));
    setBrandPickerVisible(false);
  };

  const selectModel = (model: string) => {
    setForm((current) => ({ ...current, model }));
    setModelPickerVisible(false);
  };

  const selectYear = (year: number) => {
    setForm((current) => ({ ...current, year }));
    setYearPickerVisible(false);
  };

  const pickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Chưa có quyền truy cập ảnh', 'Vui lòng cấp quyền thư viện ảnh để chọn ảnh xe.');
      return;
    }

    const remainingSlots = Math.max(0, maxVehicleImages - selectedImages.length);
    if (!remainingSlots) {
      Alert.alert('Đã đủ ảnh', 'Bạn chỉ có thể chọn tối đa 10 ảnh cho một xe.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 0.8,
    });

    if (result.canceled) return;

    const nextImages = result.assets.map((asset, index) => ({
      uri: asset.uri,
      name: asset.fileName ?? `vehicle-${Date.now()}-${index + 1}.jpg`,
      type: asset.mimeType ?? 'image/jpeg',
    }));

    updateImages([...selectedImages, ...nextImages].slice(0, maxVehicleImages));
  };

  const removeImage = (uri: string) => {
    updateImages(selectedImages.filter((image) => image.uri !== uri));
  };

  const brandSections: SelectionSection[] = useMemo(
    () => [
      {
        title: 'Thương hiệu phổ biến',
        options: popularCarBrands.map((brand) => ({ label: brand, value: brand })),
      },
      {
        title: 'Tất cả thương hiệu',
        options: carBrands
          .filter((brand) => !popularCarBrands.includes(brand))
          .map((brand) => ({ label: brand, value: brand })),
      },
    ],
    [],
  );

  const modelSections: SelectionSection[] = useMemo(
    () => [
      {
        options: modelOptions.map((model) => ({ label: model, value: model })),
      },
    ],
    [modelOptions],
  );

  const yearSections: SelectionSection[] = useMemo(
    () => [
      {
        options: productionYears.map((year) => ({ label: String(year), value: String(year) })),
      },
    ],
    [],
  );

  return (
    <>
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <SafeAreaView style={vehicleStyles.modalSafe}>
          <ScrollView
            contentContainerStyle={vehicleStyles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={vehicleStyles.modalHeader}>
              <Text style={vehicleStyles.modalTitle}>{editing ? 'Chỉnh sửa xe' : 'Thêm xe mới'}</Text>
              <Pressable onPress={onClose}>
                <Text style={vehicleStyles.close}>Đóng</Text>
              </Pressable>
            </View>

            <View style={vehicleStyles.formPanel}>
              <Text style={vehicleStyles.panelTitle}>1. Hãng xe và dòng xe</Text>
              <Text style={vehicleStyles.panelCaption}>
                Chọn từ danh sách giống web, sau đó app sẽ lọc đúng các dòng xe theo hãng đã chọn.
              </Text>

              <SelectionField
                label="Hãng xe"
                placeholder="Chọn hãng xe"
                value={form.brand}
                onPress={() => setBrandPickerVisible(true)}
              />

              <SelectionField
                label="Dòng xe"
                placeholder={form.brand ? 'Chọn dòng xe' : 'Chọn hãng xe trước'}
                value={form.model}
                disabled={!form.brand}
                onPress={() => form.brand && setModelPickerVisible(true)}
              />
            </View>

            <View style={vehicleStyles.formPanel}>
              <Text style={vehicleStyles.panelTitle}>2. Năm sản xuất</Text>
              <Text style={vehicleStyles.panelCaption}>
                Chọn năm từ danh sách để khớp với luồng web và tránh nhập sai dữ liệu.
              </Text>

              <SelectionField
                label="Năm sản xuất"
                placeholder="Chọn năm sản xuất"
                value={form.year ? String(form.year) : ''}
                onPress={() => setYearPickerVisible(true)}
              />
            </View>

            <View style={vehicleStyles.formPanel}>
              <Text style={vehicleStyles.panelTitle}>3. Biển số</Text>
              <Text style={vehicleStyles.panelCaption}>
                Biển số vẫn được nhập tay và app sẽ chuẩn hóa trước khi gửi lên backend.
              </Text>
              <FormField
                label="Biển số"
                value={form.licensePlate}
                onChangeText={update('licensePlate')}
                autoCapitalize="characters"
                placeholder="VD: 30A-123.45"
              />
            </View>

            <View style={vehicleStyles.formPanel}>
              <Text style={vehicleStyles.panelTitle}>4. Hình ảnh xe</Text>
              <Text style={vehicleStyles.panelCaption}>
                Bạn có thể chọn tối đa 10 ảnh. Ảnh mới sẽ được tải lên cùng lúc khi lưu xe.
              </Text>

              <Pressable onPress={() => void pickImages()} style={vehicleStyles.imagePickerButton}>
                <Text style={vehicleStyles.imagePickerButtonText}>+ Chọn ảnh</Text>
                <Text style={vehicleStyles.imagePickerButtonMeta}>{selectedImages.length}/10</Text>
              </Pressable>

              {editing?.images?.length ? (
                <View style={vehicleStyles.imageSection}>
                  <Text style={vehicleStyles.imageSectionTitle}>Ảnh hiện có</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={vehicleStyles.imageRow}>
                    {editing.images.map((image) => (
                      <Image key={image.id} source={{ uri: image.url }} style={vehicleStyles.previewImage} contentFit="cover" />
                    ))}
                  </ScrollView>
                </View>
              ) : null}

              {selectedImages.length ? (
                <View style={vehicleStyles.imageSection}>
                  <Text style={vehicleStyles.imageSectionTitle}>Ảnh sắp tải lên</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={vehicleStyles.imageRow}>
                    {selectedImages.map((image) => (
                      <View key={image.uri} style={vehicleStyles.previewCard}>
                        <Image source={{ uri: image.uri }} style={vehicleStyles.previewImage} contentFit="cover" />
                        <Pressable onPress={() => removeImage(image.uri)} style={vehicleStyles.removeImageButton}>
                          <Text style={vehicleStyles.removeImageButtonText}>×</Text>
                        </Pressable>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              ) : null}
            </View>

            <Text style={vehicleStyles.helperText}>
              Form mobile này đã đổi sang kiểu chọn như web để dễ dùng hơn trên app khách hàng.
            </Text>

            <Pressable disabled={saving} onPress={onSave} style={vehicleStyles.saveButton}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={vehicleStyles.saveText}>{editing ? 'Lưu thay đổi' : 'Thêm xe'}</Text>
              )}
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <SelectionSheet
        visible={brandPickerVisible}
        title="Chọn hãng xe"
        sections={brandSections}
        selectedValue={form.brand}
        onClose={() => setBrandPickerVisible(false)}
        onSelect={selectBrand}
      />

      <SelectionSheet
        visible={modelPickerVisible}
        title={form.brand ? 'Chọn dòng xe - ' + form.brand : 'Chọn dòng xe'}
        sections={modelSections}
        selectedValue={form.model}
        emptyMessage="Hãng xe này hiện chưa có dòng xe mẫu."
        onClose={() => setModelPickerVisible(false)}
        onSelect={selectModel}
      />

      <SelectionSheet
        visible={yearPickerVisible}
        title="Chọn năm sản xuất"
        sections={yearSections}
        selectedValue={form.year ? String(form.year) : ''}
        onClose={() => setYearPickerVisible(false)}
        onSelect={(value) => selectYear(Number(value))}
      />
    </>
  );
}

function SelectionField({
  label,
  value,
  placeholder,
  disabled = false,
  onPress,
}: {
  label: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <View style={vehicleStyles.selectFieldWrap}>
      <Text style={vehicleStyles.selectFieldLabel}>{label}</Text>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        style={[vehicleStyles.selectFieldButton, disabled && vehicleStyles.selectFieldButtonDisabled]}
      >
        <Text
          style={[
            vehicleStyles.selectFieldValue,
            !value && vehicleStyles.selectFieldPlaceholder,
            disabled && vehicleStyles.selectFieldValueDisabled,
          ]}
        >
          {value || placeholder}
        </Text>
        <Text style={vehicleStyles.selectFieldChevron}>⌄</Text>
      </Pressable>
    </View>
  );
}

function SelectionSheet({
  visible,
  title,
  sections,
  selectedValue,
  emptyMessage = 'Không có dữ liệu để chọn.',
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  sections: SelectionSection[];
  selectedValue: string;
  emptyMessage?: string;
  onClose: () => void;
  onSelect: (value: string) => void;
}) {
  const hasOptions = sections.some((section) => section.options.length > 0);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={vehicleStyles.sheetBackdrop}>
        <Pressable style={vehicleStyles.sheetOverlay} onPress={onClose} />
        <View style={vehicleStyles.sheetCard}>
          <View style={vehicleStyles.sheetHeader}>
            <Text style={vehicleStyles.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose}>
              <Text style={vehicleStyles.sheetClose}>Đóng</Text>
            </Pressable>
          </View>

          <ScrollView style={vehicleStyles.sheetBody} contentContainerStyle={vehicleStyles.sheetBodyContent}>
            {hasOptions ? (
              sections.map((section) => (
                <View key={section.title ?? 'default'} style={vehicleStyles.sheetSection}>
                  {section.title ? <Text style={vehicleStyles.sheetSectionTitle}>{section.title}</Text> : null}
                  {section.options.map((option) => {
                    const selected = option.value === selectedValue;
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => onSelect(option.value)}
                        style={[vehicleStyles.sheetOption, selected && vehicleStyles.sheetOptionActive]}
                      >
                        <Text
                          style={[vehicleStyles.sheetOptionText, selected && vehicleStyles.sheetOptionTextActive]}
                        >
                          {option.label}
                        </Text>
                        {selected ? <Text style={vehicleStyles.sheetOptionCheck}>✓</Text> : null}
                      </Pressable>
                    );
                  })}
                </View>
              ))
            ) : (
              <View style={vehicleStyles.sheetEmpty}>
                <Text style={vehicleStyles.sheetEmptyText}>{emptyMessage}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
