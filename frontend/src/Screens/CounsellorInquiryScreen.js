import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Modal,
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCounsellors, sendInquiry } from '../services/api';

const BLUE = '#0052CC';
const TEXT = '#172B4D';
const MUTED = '#6B778C';
const BORDER = '#DFE1E6';
const BACKGROUND = '#F4F7FC';

export default function CounsellorInquiryScreen({ navigation }) {
  const [course, setCourse] = useState('B.Sc. (Hons) in Software Engineering');
  const [subject, setSubject] = useState(
    'Inquiry regarding entry requirements & intake dates',
  );
  const [message, setMessage] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [counsellors, setCounsellors] = useState([]);
  const [selectedCounsellor, setSelectedCounsellor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isCounsellorListOpen, setIsCounsellorListOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    getCounsellors()
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.counsellors || [];
        if (mounted) {
          setCounsellors(list);
          setSelectedCounsellor(list[0] || null);
        }
      })
      .catch((error) => console.warn('Unable to load counsellors.', error))
      .finally(() => mounted && setIsLoading(false));
    return () => { mounted = false; };
  }, []);

  const handleSendInquiry = async () => {
    if (!subject.trim() || !message.trim() || !selectedCounsellor) {
      return;
    }
    setIsSending(true);
    try {
      await sendInquiry({
        userId: 42,
        counsellorId: selectedCounsellor.id,
        courseTitle: course,
        subject,
        message,
      });
      setIsModalVisible(true);
    } catch (error) {
      console.warn('Unable to send counsellor inquiry.', error);
    } finally {
      setIsSending(false);
    }
  };

  const closeModal = () => {
    setIsModalVisible(false);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.roundButton}
        >
          <Ionicons color={TEXT} name="chevron-back" size={23} />
        </Pressable>
        <Text style={styles.headerTitle}>Send Counsellor Inquiry</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.assignmentCard}>
          <Text style={styles.label}>Selected Course</Text>
          <Pressable
            accessibilityLabel={`Selected course: ${course}`}
            accessibilityRole="button"
            style={styles.courseSelector}
          >
            <Text style={styles.courseValue}>{course}</Text>
            <Ionicons color={MUTED} name="chevron-down" size={18} />
          </Pressable>

          <Text style={[styles.label, styles.counsellorLabel]}>Assigned Counsellor</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: isCounsellorListOpen }}
            onPress={() => setIsCounsellorListOpen((open) => !open)}
            style={styles.counsellorRow}
          >
            <View style={styles.counsellorAvatar}>
              <Text style={styles.avatarText}>DJ</Text>
            </View>
            <View style={styles.counsellorCopy}>
              <Text style={styles.counsellorName}>
                {selectedCounsellor?.full_name || 'No counsellor available'}
              </Text>
              <Text style={styles.counsellorTitle}>
                {selectedCounsellor?.al_stream
                  ? `Academic Counsellor - ${selectedCounsellor.al_stream}`
                  : 'Academic Counsellor'}
              </Text>
            </View>
          </Pressable>
            {isCounsellorListOpen && counsellors.map((counsellor) => (
              <Pressable
                key={counsellor.id}
                onPress={() => {
                  setSelectedCounsellor(counsellor);
                  setIsCounsellorListOpen(false);
                }}
                style={styles.counsellorOption}
              >
                <Text style={styles.counsellorOptionText}>{counsellor.full_name}</Text>
              </Pressable>
            ))}
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Subject</Text>
          <TextInput
            accessibilityLabel="Inquiry subject"
            onChangeText={setSubject}
            style={styles.subjectInput}
            value={subject}
          />
          <Text style={[styles.label, styles.messageLabel]}>Message</Text>
          <TextInput
            accessibilityLabel="Inquiry message"
            multiline
            numberOfLines={6}
            onChangeText={setMessage}
            placeholder="Type your message to the counsellor here..."
            placeholderTextColor={MUTED}
            style={styles.messageInput}
            textAlignVertical="top"
            value={message}
          />
        </View>

        {isLoading && <ActivityIndicator color={BLUE} />}
        <Pressable
          accessibilityRole="button"
          disabled={isSending || isLoading}
          onPress={handleSendInquiry}
          style={styles.sendButton}
        >
          <Ionicons color="#FFFFFF" name="send-outline" size={19} />
          {isSending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.sendButtonText}>Send Inquiry</Text>}
        </Pressable>
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={closeModal}
        transparent
        visible={isModalVisible}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.successIcon}>
                <MaterialCommunityIcons color={BLUE} name="message-text-outline" size={23} />
              </View>
              <Text style={styles.modalTitle}>Inquiry Sent Successfully!</Text>
              <Pressable
                accessibilityLabel="Close confirmation"
                accessibilityRole="button"
                onPress={closeModal}
                style={styles.closeButton}
              >
                <Ionicons color={MUTED} name="close" size={22} />
              </Pressable>
            </View>
            <View style={styles.confirmationBox}>
              <MaterialCommunityIcons color={BLUE} name="lock-outline" size={22} />
              <Text style={styles.confirmationText}>
                Dr. Jayasuriya has been notified and will reply shortly via the Student Portal.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: BACKGROUND, flex: 1 },
  header: { alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomColor: BORDER, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', height: 64, justifyContent: 'space-between', paddingHorizontal: 16 },
  roundButton: { alignItems: 'center', borderColor: BORDER, borderRadius: 20, borderWidth: 1, height: 40, justifyContent: 'center', width: 40 },
  headerTitle: { color: TEXT, fontSize: 17, fontWeight: '800' },
  headerSpacer: { width: 40 },
  scrollContent: { padding: 16, paddingBottom: 30 },
  assignmentCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16 },
  label: { color: TEXT, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  courseSelector: { alignItems: 'center', borderColor: BORDER, borderRadius: 9, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 48, paddingHorizontal: 12 },
  courseValue: { color: TEXT, flex: 1, fontSize: 13, fontWeight: '600', marginRight: 8 },
  counsellorLabel: { marginTop: 20 },
  counsellorRow: { alignItems: 'center', flexDirection: 'row' },
  counsellorAvatar: { alignItems: 'center', backgroundColor: '#DEEBFF', borderRadius: 28, height: 56, justifyContent: 'center', width: 56 },
  avatarText: { color: BLUE, fontSize: 15, fontWeight: '800' },
  counsellorCopy: { flex: 1, marginLeft: 12 },
  counsellorName: { color: TEXT, fontSize: 15, fontWeight: '800' },
  counsellorTitle: { color: MUTED, fontSize: 12, lineHeight: 17, marginTop: 4 },
  counsellorOption: { borderColor: BORDER, borderTopWidth: StyleSheet.hairlineWidth, padding: 10 },
  counsellorOptionText: { color: TEXT, fontSize: 13 },
  formCard: { backgroundColor: '#FFFFFF', borderRadius: 16, marginTop: 14, padding: 16 },
  subjectInput: { borderColor: BORDER, borderRadius: 9, borderWidth: 1, color: TEXT, fontSize: 13, minHeight: 48, paddingHorizontal: 12 },
  messageLabel: { marginTop: 18 },
  messageInput: { borderColor: BORDER, borderRadius: 9, borderWidth: 1, color: TEXT, fontSize: 13, height: 140, padding: 12 },
  sendButton: { alignItems: 'center', backgroundColor: BLUE, borderRadius: 9, flexDirection: 'row', justifyContent: 'center', marginTop: 18, minHeight: 52 },
  sendButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', marginLeft: 9 },
  modalOverlay: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', flex: 1, justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, width: '100%' },
  modalHeader: { alignItems: 'center', flexDirection: 'row' },
  successIcon: { alignItems: 'center', backgroundColor: '#DEEBFF', borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  modalTitle: { color: TEXT, flex: 1, fontSize: 16, fontWeight: '800', marginLeft: 11 },
  closeButton: { padding: 4 },
  confirmationBox: { alignItems: 'flex-start', backgroundColor: '#EBF3FE', borderRadius: 11, flexDirection: 'row', marginTop: 20, padding: 14 },
  confirmationText: { color: '#0747A6', flex: 1, fontSize: 13, lineHeight: 19, marginLeft: 10 },
});
