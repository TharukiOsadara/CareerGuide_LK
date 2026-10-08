import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomNavigation from '../Components/BottomNavigation';
import {
  deleteAcademicProfile,
  deleteUserProfile,
  getStudentProfile,
  updateUserProfile,
} from '../services/api';

const BLUE = '#0052CC';
const TEXT = '#172B4D';
const MUTED = '#6B778C';
const BORDER = '#DFE1E6';

const fallbackSkills = [
  { name: 'Logical Reasoning', percentage: 92 },
  { name: 'Analytical Thinking', percentage: 88 },
  { name: 'Creative / Design', percentage: 81 },
  { name: 'Communication', percentage: 76 },
];

const fallbackCareers = [
  {
    title: 'Software Engineering',
    match: '96% Match',
    description: 'Build innovative software solutions and digital products.',
  },
  {
    title: 'Data Science',
    match: '91% Match',
    description: 'Turn complex data into meaningful insights and decisions.',
  },
  {
    title: 'UX / UI Design',
    match: '87% Match',
    description: 'Create useful, accessible, and engaging user experiences.',
  },
];

function normalizeAcademicProfile(value) {
  if (!value) {
    return null;
  }

  let subjectGrades = value.subjectGrades ?? value.subject_grades;
  if (typeof subjectGrades === 'string') {
    try {
      subjectGrades = JSON.parse(subjectGrades);
    } catch (error) {
      console.warn('Unable to parse saved subject grades.', error);
      subjectGrades = [];
    }
  }

  return {
    subjectStream: value.subjectStream ?? value.subject_stream,
    district: value.district,
    zScore: value.zScore ?? value.z_score,
    subjectGrades: Array.isArray(subjectGrades) ? subjectGrades : [],
  };
}

export default function StudentProfileScreen({ navigation, route }) {
  const [profile, setProfile] = useState(() => ({
    academicProfile: normalizeAcademicProfile(route?.params?.academicProfile),
  }));
  const [isLoading, setIsLoading] = useState(true);
  const [isPictureEditorVisible, setIsPictureEditorVisible] = useState(false);
  const [isUpdatingPicture, setIsUpdatingPicture] = useState(false);
  const [isProfileEditorVisible, setIsProfileEditorVisible] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ fullName: '', grade: '' });
  const [isDeleteDetailsVisible, setIsDeleteDetailsVisible] = useState(false);
  const [detailsToDelete, setDetailsToDelete] = useState([]);
  useEffect(() => {
    let mounted = true;
    getStudentProfile()
      .then((data) => mounted && setProfile({
        ...data,
        academicProfile: normalizeAcademicProfile(
          data?.academicProfile || route?.params?.academicProfile,
        ),
      }))
      .catch((error) => console.warn('Unable to load student profile.', error))
      .finally(() => mounted && setIsLoading(false));
    return () => { mounted = false; };
  }, []);

  const skills = profile?.aptitude
    ? Object.entries(profile.aptitude).map(([name, percentage]) => ({
        name: name.replace(/([A-Z])/g, ' $1').replace(/^./, (value) => value.toUpperCase()),
        percentage,
      }))
    : fallbackSkills;
  const careers = profile?.careerPaths?.length
    ? profile.careerPaths.map((career) => ({
        title: career.title,
        match: career.match,
        description: career.note,
      }))
    : fallbackCareers;
  const user = profile?.user;
  const academicProfile = normalizeAcademicProfile(profile?.academicProfile);
  const subjectGrades = academicProfile?.subjectGrades || [];
  const openProfileEditor = () => {
    setProfileForm({
      fullName: user?.full_name || '',
      grade: user?.grade || '',
    });
    setIsProfileEditorVisible(true);
  };

  const saveProfileDetails = async () => {
    if (!profileForm.fullName.trim() || !profileForm.grade.trim()) {
      Alert.alert('Missing details', 'Enter the student name and grade.');
      return;
    }
    setIsUpdatingProfile(true);
    try {
      const response = await updateUserProfile({
        userId: user?.id || 42,
        fullName: profileForm.fullName,
        grade: profileForm.grade,
      });
      setProfile((current) => ({
        ...(current || {}),
        user: { ...(current?.user || {}), ...response.data },
      }));
      setIsProfileEditorVisible(false);
    } catch (error) {
      Alert.alert('Unable to update profile', error.message);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const confirmDeleteUserProfile = async () => {
    if (detailsToDelete.length === 0) {
      Alert.alert('Select details', 'Choose at least one profile detail to delete.');
      return;
    }
    try {
      const response = await deleteUserProfile(user?.id || 42, detailsToDelete);
      setProfile((current) => ({
        ...(current || {}),
        user: { ...(current?.user || {}), ...response.data },
      }));
      setDetailsToDelete([]);
      setIsDeleteDetailsVisible(false);
    } catch (error) {
      Alert.alert('Unable to delete profile details', error.message);
    }
  };

  const toggleDetailToDelete = (detail) => {
    setDetailsToDelete((current) => (
      current.includes(detail)
        ? current.filter((item) => item !== detail)
        : [...current, detail]
    ));
  };
  const goBackToPreviousScreen = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Main');
  };

  const choosePicture = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Allow photo access to choose a profile picture.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        base64: true,
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.base64) {
        return;
      }

      const asset = result.assets[0];
      const mimeType = asset.mimeType || 'image/jpeg';
      const value = `data:${mimeType};base64,${asset.base64}`;
      setIsUpdatingPicture(true);
      const response = await updateUserProfile({
        userId: user?.id || 42,
        zScore: academicProfile?.zScore ?? 0,
        profilePicture: value,
      });
      setProfile((current) => ({
        ...(current || {}),
        user: {
          ...(current?.user || user || { id: user?.id || 42 }),
          profilePicture: response?.data?.profilePicture || value,
        },
      }));
      setIsPictureEditorVisible(false);
    } catch (error) {
      Alert.alert('Unable to update picture', error.message);
    } finally {
      setIsUpdatingPicture(false);
    }
  };

  const confirmDeleteAcademicProfile = () => {
    Alert.alert(
      'Delete academic profile?',
      'This will remove the saved stream, Z-Score, district, and subject grades.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAcademicProfile(user?.id || 42);
              setProfile((current) => ({ ...current, academicProfile: null }));
            } catch (error) {
              Alert.alert('Unable to delete academic profile', error.message);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F7FC' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F9FC" />

      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={10}
          onPress={goBackToPreviousScreen}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Student Profile</Text>
        <Pressable
          accessibilityLabel="Follow up with student"
          accessibilityRole="button"
          style={styles.followButton}
        >
          <Text style={styles.followIcon}>⚑</Text>
          <Text style={styles.followText}>Follow-up</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.identityCard}>
          <View style={styles.identityTopRow}>
            <Pressable
              accessibilityLabel="Change profile picture"
              accessibilityRole="button"
              onPress={() => setIsPictureEditorVisible(true)}
            >
              {user?.profilePicture ? (
                <Image source={{ uri: user.profilePicture }} style={styles.avatar} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>TO</Text>
                </View>
              )}
              <Text style={styles.changePictureText}>Change</Text>
            </Pressable>
            <View style={styles.identityDetails}>
              <Text style={styles.studentName}>{user?.full_name || 'Savindi Piyarathna'}</Text>
              <Text style={styles.studentEmail}>{user?.email || 'Email not available'}</Text>
              <Text style={styles.studentMeta}>
                Grade {user?.grade || 'Not set'} · {user?.al_stream || 'Stream not set'} · Index No. 4521
              </Text>
            </View>
            <View style={styles.reviewedBadge}>
              <Text style={styles.reviewedText}>REVIEWED</Text>
            </View>
          </View>
          <View style={styles.profileActions}>
            <Pressable onPress={openProfileEditor} style={styles.editProfileButton}>
              <Text style={styles.editAcademicText}>Edit profile</Text>
            </Pressable>
            <Pressable
              onPress={() => setIsDeleteDetailsVisible(true)}
              style={styles.deleteAcademicButton}
            >
              <Text style={styles.deleteAcademicText}>Delete profile</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Academic Profile</Text>
          {academicProfile ? (
            <View style={styles.academicCard}>
              <Text style={styles.academicValue}>{academicProfile.subjectStream}</Text>
              <Text style={styles.academicMeta}>
                District: {academicProfile.district} · Z-Score: {academicProfile.zScore}
              </Text>
              <View style={styles.gradeList}>
                {subjectGrades.map((item) => (
                  <View key={item.subject} style={styles.gradeItem}>
                    <Text style={styles.gradeSubject}>{item.subject}</Text>
                    <Text style={styles.gradeValue}>{item.grade}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.academicActions}>
                <Pressable
                  accessibilityLabel="Edit academic profile"
                  accessibilityRole="button"
                  onPress={() => navigation.navigate('AcademicProfile')}
                  style={styles.editAcademicButton}
                >
                  <Text style={styles.editAcademicText}>Edit details</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="Delete academic profile"
                  accessibilityRole="button"
                  onPress={confirmDeleteAcademicProfile}
                  style={styles.deleteAcademicButton}
                >
                  <Text style={styles.deleteAcademicText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.academicCard}>
              <Text style={styles.emptyAcademicText}>No academic details saved yet.</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => navigation.navigate('AcademicProfile')}
              >
                <Text style={styles.addAcademicText}>Add academic details</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aptitude &amp; Interest Assessment</Text>
          {isLoading && <ActivityIndicator color={BLUE} />}
          <View style={styles.assessmentCard}>
            {skills.map((skill) => (
              <View key={skill.name} style={styles.skillRow}>
                <View style={styles.skillHeader}>
                  <Text style={styles.skillName}>{skill.name}</Text>
                  <Text style={styles.skillPercentage}>{skill.percentage}%</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[styles.progressFill, { width: `${skill.percentage}%` }]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top 3 Matched Career Paths</Text>
          {careers.map((career, index) => (
            <View key={career.title} style={styles.careerCard}>
              <View style={styles.careerNumber}>
                <Text style={styles.careerNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.careerDetails}>
                <View style={styles.careerTitleRow}>
                  <Text style={styles.careerTitle}>{career.title}</Text>
                  <View style={styles.matchBadge}>
                    <Text style={styles.matchText}>{career.match}</Text>
                  </View>
                </View>
                <Text style={styles.careerDescription}>{career.description}</Text>
                <Text style={styles.verifiedText}>
                  Source: Aptitude Assessment · verified
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionTitle}>Counsellor Recommendation Notes</Text>
            <Pressable
              accessibilityLabel="Edit recommendation notes"
              accessibilityRole="button"
              hitSlop={8}
            >
              <Text style={styles.editIcon}>✎</Text>
            </Pressable>
          </View>
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>
              Savindi shows strong potential in technology-focused careers. Encourage
              further practice in communication and participation in collaborative
              projects.
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => navigation.navigate('CounsellorInquiry')}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Tap to send inquiry to counsellor</Text>
          <Text style={styles.primaryButtonArrow}>→</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Sign Out</Text>
        </Pressable>
      </ScrollView>

      <Modal
        animationType="slide"
        onRequestClose={() => setIsPictureEditorVisible(false)}
        transparent
        visible={isPictureEditorVisible}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pictureModal}>
            <Text style={styles.pictureModalTitle}>Update profile picture</Text>
            <Text style={styles.pictureModalHint}>Choose a photo from your mobile device.</Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setIsPictureEditorVisible(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={isUpdatingPicture}
                onPress={choosePicture}
                style={styles.savePictureButton}
              >
                {isUpdatingPicture
                  ? <ActivityIndicator color="#FFFFFF" />
                  : <Text style={styles.savePictureText}>Choose photo</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={() => setIsDeleteDetailsVisible(false)}
        transparent
        visible={isDeleteDetailsVisible}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pictureModal}>
            <Text style={styles.pictureModalTitle}>Delete profile</Text>
            {[
              ['grade', 'Grade'],
              ['profilePicture', 'Profile picture'],
            ].map(([key, label]) => (
              <Pressable
                key={key}
                onPress={() => toggleDetailToDelete(key)}
                style={styles.detailDeleteOption}
              >
                <View style={[
                  styles.detailDeleteCheckbox,
                  detailsToDelete.includes(key) && styles.detailDeleteCheckboxSelected,
                ]}>
                  {detailsToDelete.includes(key) && (
                    <Text style={styles.detailDeleteCheckmark}>✓</Text>
                  )}
                </View>
                <Text style={styles.detailDeleteText}>{label}</Text>
              </Pressable>
            ))}
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setIsDeleteDetailsVisible(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={confirmDeleteUserProfile} style={styles.deleteConfirmButton}>
                <Text style={styles.savePictureText}>Delete selected</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={() => setIsProfileEditorVisible(false)}
        transparent
        visible={isProfileEditorVisible}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pictureModal}>
            <Text style={styles.pictureModalTitle}>Update student profile</Text>
            <TextInput
              onChangeText={(fullName) => setProfileForm((current) => ({ ...current, fullName }))}
              placeholder="Student name"
              style={styles.profileInput}
              value={profileForm.fullName}
            />
            <TextInput
              onChangeText={(grade) => setProfileForm((current) => ({ ...current, grade }))}
              placeholder="Grade"
              style={styles.profileInput}
              value={profileForm.grade}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setIsProfileEditorVisible(false)} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable disabled={isUpdatingProfile} onPress={saveProfileDetails} style={styles.savePictureButton}>
                {isUpdatingProfile
                  ? <ActivityIndicator color="#FFFFFF" />
                  : <Text style={styles.savePictureText}>Save</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <BottomNavigation activeRoute="StudentProfile" navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomColor: BORDER,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    height: 64,
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  backButton: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    width: 82,
  },
  backIcon: {
    color: TEXT,
    fontSize: 36,
    fontWeight: '300',
    lineHeight: 38,
  },
  headerTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '700',
  },
  followButton: {
    alignItems: 'center',
    borderColor: BLUE,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 9,
  },
  followIcon: {
    color: BLUE,
    fontSize: 16,
  },
  followText: {
    color: BLUE,
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  identityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
  },
  identityTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    width: '100%',
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#DEEBFF',
    borderRadius: 38,
    height: 76,
    justifyContent: 'center',
    width: 76,
  },
  avatarText: {
    color: BLUE,
    fontSize: 22,
    fontWeight: '800',
  },
  changePictureText: {
    color: BLUE,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  identityDetails: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  studentName: {
    color: TEXT,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 7,
  },
  studentEmail: {
    color: MUTED,
    fontSize: 12,
    marginBottom: 4,
  },
  studentMeta: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 18,
  },
  reviewedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E3FCEF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  reviewedText: {
    color: '#006644',
    fontSize: 10,
    fontWeight: '800',
  },
  profileActions: {
    alignItems: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    width: '100%',
  },
  editProfileButton: {
    borderColor: BLUE,
    borderRadius: 7,
    borderWidth: 1,
    flex: 1,
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  detailDeleteOption: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: 10,
  },
  detailDeleteCheckbox: {
    alignItems: 'center',
    borderColor: BORDER,
    borderRadius: 4,
    borderWidth: 1,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  detailDeleteCheckboxSelected: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },
  detailDeleteCheckmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
  },
  detailDeleteText: {
    color: TEXT,
    fontSize: 14,
    marginLeft: 10,
  },
  deleteConfirmButton: {
    alignItems: 'center',
    backgroundColor: '#DE350B',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    color: TEXT,
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  academicCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
  },
  academicValue: {
    color: TEXT,
    fontSize: 15,
    fontWeight: '700',
  },
  academicMeta: {
    color: MUTED,
    fontSize: 12,
    marginTop: 6,
  },
  gradeList: {
    marginTop: 13,
  },
  gradeItem: {
    alignItems: 'center',
    borderBottomColor: BORDER,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
  },
  gradeSubject: {
    color: TEXT,
    flex: 1,
    fontSize: 13,
  },
  gradeValue: {
    backgroundColor: '#DEEBFF',
    borderRadius: 12,
    color: BLUE,
    fontSize: 13,
    fontWeight: '800',
    minWidth: 34,
    paddingHorizontal: 8,
    paddingVertical: 4,
    textAlign: 'center',
  },
  academicActions: {
    borderTopColor: BORDER,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
  },
  editAcademicButton: {
    borderColor: BLUE,
    borderRadius: 7,
    borderWidth: 1,
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editAcademicText: {
    color: BLUE,
    fontSize: 12,
    fontWeight: '700',
  },
  deleteAcademicButton: {
    borderColor: '#DE350B',
    borderRadius: 7,
    borderWidth: 1,
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteAcademicText: {
    color: '#DE350B',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyAcademicText: {
    color: MUTED,
    fontSize: 13,
  },
  addAcademicText: {
    color: BLUE,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
  },
  assessmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
  },
  skillRow: {
    marginBottom: 16,
  },
  skillRowLast: {
    marginBottom: 0,
  },
  skillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  skillName: {
    color: MUTED,
    fontSize: 13,
  },
  skillPercentage: {
    color: TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  progressTrack: {
    backgroundColor: '#EBECF0',
    borderRadius: 5,
    height: 8,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: BLUE,
    borderRadius: 5,
    height: '100%',
  },
  careerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    flexDirection: 'row',
    marginBottom: 12,
    padding: 14,
  },
  careerNumber: {
    alignItems: 'center',
    backgroundColor: '#F1F3F5',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  careerNumberText: {
    color: BLUE,
    fontSize: 18,
    fontWeight: '800',
  },
  careerDetails: {
    flex: 1,
    marginLeft: 12,
  },
  careerTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  careerTitle: {
    color: TEXT,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    marginRight: 8,
  },
  matchBadge: {
    backgroundColor: '#DEEBFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  matchText: {
    color: BLUE,
    fontSize: 10,
    fontWeight: '800',
  },
  careerDescription: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
  },
  verifiedText: {
    color: '#8993A4',
    fontSize: 10,
    marginTop: 8,
  },
  sectionHeadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  editIcon: {
    color: BLUE,
    fontSize: 22,
    marginBottom: 12,
    marginLeft: 12,
  },
  notesBox: {
    backgroundColor: '#FFFFFF',
    borderColor: BORDER,
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
  },
  notesText: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 21,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: BLUE,
    borderRadius: 9,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 26,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButtonArrow: {
    color: '#FFFFFF',
    fontSize: 22,
    marginLeft: 10,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: BLUE,
    borderRadius: 9,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 50,
  },
  secondaryButtonText: {
    color: '#DE350B',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  pictureModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
  },
  pictureModalTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: '700',
  },
  pictureModalHint: {
    color: MUTED,
    fontSize: 12,
    marginTop: 6,
  },
  profileInput: {
    borderColor: BORDER,
    borderRadius: 8,
    borderWidth: 1,
    color: TEXT,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  cancelButton: {
    justifyContent: 'center',
    marginRight: 10,
    paddingHorizontal: 12,
  },
  cancelButtonText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '700',
  },
  savePictureButton: {
    alignItems: 'center',
    backgroundColor: BLUE,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: 74,
    paddingHorizontal: 16,
  },
  savePictureText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
