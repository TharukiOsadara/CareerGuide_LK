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
import { getCourseSelection, getCourses, sendInquiry } from '../services/api';

const BLUE = '#0052CC';
const TEXT = '#172B4D';
const MUTED = '#6B778C';
const BORDER = '#DFE1E6';
const BACKGROUND = '#F4F7FC';

export default function CounsellorInquiryScreen({ navigation, route }) {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [subject, setSubject] = useState(
    'Inquiry regarding entry requirements & intake dates',
  );
  const [message, setMessage] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isCourseListOpen, setIsCourseListOpen] = useState(false);
  const [sendError, setSendError] = useState('');

  useEffect(() => {
    let mounted = true;
    // A student's questions always go to their ONE matched counsellor, so once they have
    // chosen a course every course shows that counsellor.
    Promise.all([getCourses(), getCourseSelection().catch(() => null)])
      .then(([data, selection]) => {
        if (!mounted) return;
        const list = selection?.counsellor
          ? data.map((c) => ({ ...c, counsellor_id: selection.counsellor.id, counsellor_name: selection.counsellor.name }))
          : data;
        const wantedId = Number(route?.params?.courseId) || selection?.course?.id;
        setCourses(list);
        setSelectedCourse(list.find((c) => c.id === wantedId) || list[0] || null);
      })
      .catch((error) => console.warn('Unable to load courses for inquiry.', error))
      .finally(() => mounted && setIsLoading(false));
    return () => { mounted = false; };
  }, []);

  const handleSendInquiry = async () => {
    if (!subject.trim() || !message.trim() || !selectedCourse) {
      return;
    }
    setIsSending(true);
    setSendError('');
    try {
      await sendInquiry({
        userId: 42, // dev fallback only; the signed-in student's token takes priority
        courseId: selectedCourse.id,
        courseTitle: selectedCourse.title,
        subject,
        message,
      });
      setIsModalVisible(true);
    } catch (error) {
      console.warn('Unable to send counsellor inquiry.', error);
      setSendError(error.message || 'Could not send your inquiry. Please try again.');
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
            accessibilityLabel={`Selected course: ${selectedCourse?.title || 'None selected'}`}
            accessibilityRole="button"
            onPress={() => setIsCourseListOpen((open) => !open)}
            style={styles.courseSelector}
          >
            <Text style={styles.courseValue}>{selectedCourse?.title || 'Select a course'}</Text>
            <Ionicons color={MUTED} name="chevron-down" size={18} />
          </Pressable>
          {isCourseListOpen && courses.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => {
                setSelectedCourse(item);
                setIsCourseListOpen(false);
              }}
              style={styles.courseOption}
            >
              <Text style={styles.courseOptionText}>{item.title}</Text>
            </Pressable>
          ))}

          <Text style={[styles.label, styles.counsellorLabel]}>Assigned Counsellor</Text>
          <View style={styles.counsellorRow}>
            <View style={styles.counsellorAvatar}>
              <Text style={styles.avatarText}>
                {(selectedCourse?.counsellor_name || 'NA').slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.counsellorCopy}>
              <Text style={styles.counsellorName}>
                {selectedCourse?.counsellor_name || 'No counsellor assigned'}
              </Text>
              <Text style={styles.counsellorTitle}>
                {selectedCourse?.counsellor_name ? 'Assigned course counsellor' : 'Please select another course'}
              </Text>
            </View>
          </View>
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
        {sendError ? <Text style={styles.sendError}>{sendError}</Text> : null}
        <Pressable
          accessibilityRole="button"
          disabled={isSending || isLoading || !selectedCourse?.counsellor_id}
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
                {selectedCourse?.counsellor_name || 'The assigned counsellor'} has been notified
                and will reply shortly via the Student Portal.
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
  courseOption: { borderColor: BORDER, borderTopWidth: StyleSheet.hairlineWidth, padding: 10 },
  courseOptionText: { color: TEXT, fontSize: 13 },
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
  sendError: { color: '#DE350B', backgroundColor: '#FFEBE6', borderRadius: 8, padding: 10, marginTop: 14, fontSize: 12.5 },
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
