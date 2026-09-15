import AntDesign from '@expo/vector-icons/AntDesign';
import Entypo from '@expo/vector-icons/Entypo';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { url } from '../../../constants/EnvValue';
import { useContextData } from "../../../context/EmployeeContext";
import { useOfficeContextData } from "../../../context/OfficeContext";
import { getApiErrorMessage, getToken } from '../../../services/ApiService';

function OfficeSettings() {
  const [formData, setFormData] = useState({
    startTime: null,
    endTime: null,
    breakTime: 0,
    latitude: null,
    longitude: null,
    name: '',
    id: null,
    range:'1000',
    autoFinalizeTime: null
  });
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [showAutoFinalize, setShowAutoFinalize] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [officeList, setOfficeList] = useState([]);
  const [actionType, setActionType] = useState('add'); 
  const router = useRouter();
  const {showToast} = useContextData();
  const {setOfficeData} = useOfficeContextData();

  const fetchOfficeDetails = async () => {
    try {
      const response = await axios.get(`${url}/api/offices/`, {
        headers: {
          authorization: `Bearer ${await getToken()}`
        }
      });

      // Populate form data with fetched data
      const data = response.data;
      // setFormData({
      //   startTime: data.checkin ? new Date(data.checkin) : null,
      //   endTime: data.checkout ? new Date(data.checkout) : null,
      //   breakTime: data.breakTime || 0,
      //   latitude: data.latitude || null,
      //   longitude: data.longitude || null
      // });
      const offices = Array.isArray(data?.offices) ? data.offices : [];
      setOfficeList(offices);
      setOfficeData(offices);
    } catch (error) {
      showToast(getApiErrorMessage(error, "Error fetching office details"), "Error");
      console.error('Error fetching office details:', error);
    }
  }

  const setUpdateEmployeeData = (data) => {
    setFormData({
      name: data.name || '',
      startTime: data.checkin ? new Date(data.checkin) : null,
      endTime: data.checkout ? new Date(data.checkout) : null,
      breakTime: data.breakTime || 0,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      id: data.id || null,
      range: data.range ? String(data.range) : '1000',
      autoFinalizeTime: data.autoFinalizeTime ? new Date(data.autoFinalizeTime) : null
    });
    setModalVisible(true);
  }

  const resetFormData = () => {
    setFormData({
      startTime: null,
      endTime: null,
      breakTime: 0,
      latitude: null,
      longitude: null,
      name: '',
      id: null,
      range:'1000',
      autoFinalizeTime: null
    });
  }




const addOffice = async () => {
  try {
    setIsLoading(true);

      const convertToUTC = (date) => {
      if (!date) return null;
      
      // Create base UTC date for today
      const utcDate = new Date();
      utcDate.setUTCHours(0, 0, 0, 0); // Reset to start of day
      
      // Set hours and minutes from input date
      const hours = date.getHours();
      const minutes = date.getMinutes();
      
      // Create new date with same day but updated hours/minutes
      const convertedDate = new Date(utcDate);
      convertedDate.setUTCHours(hours - 5, minutes - 30, 0, 0); // Subtract 5:30 for IST offset
      
      return convertedDate.toISOString();
    };
    
    const checkinUTC = convertToUTC(formData.startTime);
    const checkoutUTC = convertToUTC(formData.endTime);
    const autoFinalizeUTC = convertToUTC(formData.autoFinalizeTime);


         // validate form data
      if(!formData.name || formData.name.trim() === ''){
        showToast('Please enter office name','Warning')
        return
      }
      if (!checkinUTC || !checkoutUTC) {
        showToast('Please select both start and end times','Warning')
        return;
      }
      if (formData.breakTime < 0) {
        showToast('Break time cannot be negative','Warning')
        return;
      }
      if (!formData.latitude || !formData.longitude) {
        showToast('Please set the office location','Warning')
        return;
      }

   

      const response = await axios.post(`${url}/api/offices/create`, {
        checkin: checkinUTC,
        checkout: checkoutUTC,
        breakTime: formData.breakTime,
        latitude: formData.latitude,
        longitude: formData.longitude,
        name: formData.name,
        range:formData.range,
        autoFinalizeTime: autoFinalizeUTC || null
      }, {
        headers: {
          authorization: `Bearer ${await getToken()}`
        }
      });
      if(response.data.message){
        showToast('Office added successfully!', 'Success');
        setModalVisible(false);
        resetFormData();
        fetchOfficeDetails();
      }
  }catch (error) {
    console.error('Error adding office:', error);
    showToast(getApiErrorMessage(error, 'Failed to add office'), 'Error');
  }finally {
    setIsLoading(false);
  }

}

const updateOfficeSettings = async () => {
  try {
    setIsLoading(true);
    
    // Convert local time to UTC timestamp
    const convertToUTC = (date) => {
      if (!date) return null;
      
      // Create base UTC date for today
      const utcDate = new Date();
      utcDate.setUTCHours(0, 0, 0, 0); // Reset to start of day
      
      // Set hours and minutes from input date
      const hours = date.getHours();
      const minutes = date.getMinutes();
      
      // Create new date with same day but updated hours/minutes
      const convertedDate = new Date(utcDate);
      convertedDate.setUTCHours(hours - 5, minutes - 30, 0, 0); // Subtract 5:30 for IST offset
      
      return convertedDate.toISOString();
    };
    

    
    const checkinUTC = convertToUTC(formData.startTime);
    const checkoutUTC = convertToUTC(formData.endTime);
    const autoFinalizeUTC = convertToUTC(formData.autoFinalizeTime);
    


        // validate form data
      if(!formData.name || formData.name.trim() === ''){
        showToast('Please enter office name','Warning')
        return
      }
      if (!checkinUTC || !checkoutUTC) {
        showToast('Please select both start and end times','Warning')
        return;
      }
      if (formData.breakTime < 0) {
        showToast('Break time cannot be negative','Warning')
        return;
      }
      if (!formData.latitude || !formData.longitude) {
        showToast('Please set the office location','Warning')
        return;
      }


    const response = await axios.put(`${url}/api/offices/update/${formData.id}`, {
      checkin: checkinUTC,
      checkout: checkoutUTC,
      breakTime: formData.breakTime,
      latitude: formData.latitude,
      longitude: formData.longitude,
      name: formData.name,
      range:formData.range,
      autoFinalizeTime: autoFinalizeUTC || null
    }, {
      headers: {
        authorization: `Bearer ${await getToken()}`
      }
    });

    if(response.data.message){
      showToast('Office settings updated successfully!', 'Success');
      setModalVisible(false);
      resetFormData();
      fetchOfficeDetails();
    }
  } catch (error) {
    console.error('Error updating office settings:', error);
    showToast(getApiErrorMessage(error, 'Failed to update office settings'), 'Error');
  } finally {
    setIsLoading(false);
  }
};

const deleteOffice = async (officeId) => {
  try {
    const response = await axios.delete(`${url}/api/offices/delete/${officeId}`, {
      headers: {
        authorization: `Bearer ${await getToken()}`
      }
    });
    if(response.data.message){
      showToast('Office deleted successfully!', 'Success');
      fetchOfficeDetails();
    }
  } catch (error) {
    console.error('Error deleting office:', error);
    showToast(getApiErrorMessage(error, 'Failed to delete office'), 'Error');
  } 
};


  const getCurrentLocation = async () => {
    try {
      setIsLoading(true);
      
      // Request location permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('Permission to access location was denied', 'Warning');
        return;
      }

      // Get current position
      let location = await Location.getCurrentPositionAsync({});
      
      setFormData(prev => ({
        ...prev,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      }));
      
      showToast( 'Current location captured successfully!','Success');
    } catch (error) {
      console.error('Error getting location:', error);
      showToast('Failed to get current location. Please check GPS & permissions.','Error');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  useFocusEffect(
    useCallback(() => {
      fetchOfficeDetails();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchOfficeDetails();
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleTimeChange = (event, selectedTime, type) => {
    if (event.type === 'dismissed') {
      if (type === 'start') {
        setShowStart(false);
      } else if (type === 'end') {
        setShowEnd(false);
      } else if (type === 'autoFinalize') {
        setShowAutoFinalize(false);
      }
      return;
    }
    const currentTime = selectedTime || new Date();
    if (type === 'start') {
      setShowStart(false);
      updateFormData('startTime', currentTime);
    } else if (type === 'end') {
      setShowEnd(false);
      updateFormData('endTime', currentTime);
    } else if (type === 'autoFinalize') {
      setShowAutoFinalize(false);
      updateFormData('autoFinalizeTime', currentTime);
    }
  };

  const formatTime = (time) => {
    if (!time) return '';
    return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getBreakHours = () => Math.floor(formData.breakTime / 60);
  const getBreakMinutes = () => formData.breakTime % 60;

  const updateBreakTime = (hours, minutes) => {
    const totalMinutes = (hours * 60) + minutes;
    updateFormData('breakTime', totalMinutes);
  };

  return (
    <SafeAreaView style={styles.container}>
     <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#4A9EFF']}
              tintColor="#4A9EFF"
            />
          }
        >
    
      <Text style={styles.header}>Office Settings</Text>

      {/* general settings   */}
      <View style={styles.generalSettingsContainer}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: '#8f9eb3', fontSize: 16, fontWeight: 'bold' }}>GENERAL</Text>
          {/* <TouchableOpacity
            onPress={updateOfficeSettings}
            disabled={isLoading}
            style={{
              backgroundColor: '#1173d4',
              paddingHorizontal: 15,
              paddingVertical: 8,
              borderRadius: 8,
              opacity: isLoading ? 0.6 : 1
            }}
          >
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>
              {isLoading ? 'Updating...' : 'Update'}
            </Text>
          </TouchableOpacity> */}
        </View>
        <View style={styles.tabContainer}>
          <TouchableOpacity onPress={() => router.push('/(settings)/HolidayManagement')} style={[styles.tab]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 30 }}>
              <AntDesign name="calendar" size={24} color="#1173d4" />
              <Text style={{ color: '#fff', fontSize: 20 }}>Holidays</Text>
            </View>
            <Entypo name="chevron-right" size={24} color="#8695aa" />
          </TouchableOpacity>
        </View>
      </View>

      {/* office location */}
      <View style={{ gap: 20, padding: 10, marginTop: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: '#8f9eb3', fontSize: 16, fontWeight: 'bold' }}>OFFICE LOCATION</Text>
          <TouchableOpacity
            onPress={()=>
             {
               setModalVisible(true)
                setActionType('add')
             }}
            disabled={isLoading}
            style={{
              backgroundColor: '#1173d4',
              paddingHorizontal: 15,
              paddingVertical: 8,
              borderRadius: 8,
              opacity: isLoading ? 0.6 : 1
            }}
          >
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>
              {isLoading ? 'Adding...' : 'Add Office'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* list of offices */}
      <View style={{ padding: 10, gap: 10 }}>
        {officeList.length === 0 ? (
          <Text style={{ color: '#8f9eb3', fontStyle: 'italic' }}>No offices added yet.</Text>
        ) : (
          officeList.map((office, index) => (
            <View 
              key={index}
              style={{ 
                borderWidth: 1, 
                borderColor: '#334155',
                borderRadius: 10,
                padding: 15,
                backgroundColor: '#1e293b',
                gap: 5
              }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{office.name || `Office ${index + 1}`}</Text>
              <Text style={{ color: '#8f9eb3' }}>Coordinates: Lat {Number(office.latitude || 0).toFixed(6)}, Lng {Number(office.longitude || 0).toFixed(6)}</Text>
              <Text style={{ color: '#8f9eb3' }}>
                Timings: {office.checkin ? new Date(office.checkin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'} - {office.checkout ? new Date(office.checkout).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
              </Text>
              <Text style={{ color: '#8f9eb3' }}>Break Time: {office.breakTime} mins </Text>
              <Text style={{ color: '#8f9eb3' }}>Office Range: {office.range} meters</Text>
              <Text style={{ color: '#8f9eb3' }}>
                Auto-Finalize: {office.autoFinalizeTime ? new Date(office.autoFinalizeTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Default (Shift End + 3h)'}
              </Text>

              {/* Edit button - functionality to be implemented */}
              <View style={{ alignItems: 'flex-end', marginTop: 10 ,flexDirection:'row',justifyContent:'flex-end',gap:10,width:'100%'}}>

                <TouchableOpacity 
                  onPress={() => deleteOffice(office.id)}
                style={{ paddingHorizontal: 15, 
                paddingVertical: 8, borderRadius: 8, 
                  justifyContent:'center',
                  alignItems:'center',
                width:"30%",
                backgroundColor:'#ee4714ff'
                 }}>
                  <Text style={{ color: '#ffffffff', fontSize: 14,fontWeight:'bold' }}>Delete</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setUpdateEmployeeData(office)
                    setActionType('edit')
                  }
                  }
                  style={{
                    backgroundColor: '#1173d4', 
                    paddingHorizontal: 15,
                    paddingVertical: 8,
                    borderRadius: 8,
                    width:"30%",
                    justifyContent:'center',
                    alignItems:'center'
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>Edit</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Modal for office location and timings */}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
        }}
      >
         <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView 
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
            >



                              {/* name */}
                              <View style={{ gap: 10, marginBottom: 20 }}>
                                <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: 'bold' }}>Office Name</Text>
                                <TextInput
                                  value={formData.name}
                                  onChangeText={(text) => updateFormData('name', text)}
                                  placeholder="Enter office name"
                                  placeholderTextColor="#8f9eb3"
                                  style={{
                                    borderWidth: 1,
                                    borderColor: '#334155',
                                    borderRadius: 10,
                                    padding: 15,
                                    color: '#fff'
                                  }}
                                />
                              </View>
                             {/* location input */}
                             <View style={{ gap: 15 }}>
                                <View style={{ gap: 10 }}>
                                  <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: 'bold' }}>Coordinates</Text>
                                  <View style={{ 
                                    borderWidth: 1, 
                                    borderColor: '#334155', 
                                    borderRadius: 10, 
                                    padding: 15,
                                    backgroundColor: '#1e293b'
                                  }}>
                                    <Text style={{ color: formData.latitude && formData.longitude ? '#fff' : '#8f9eb3' }}>
                                      {formData.latitude && formData.longitude 
                                        ? `Lat: ${formData.latitude.toFixed(6)}, Lng: ${formData.longitude.toFixed(6)}`
                                        : 'No location set'
                                      }
                                    </Text>
                                  </View>
                                </View>
                                
                                <TouchableOpacity
                                  onPress={getCurrentLocation}
                                  disabled={isLoading}
                                  style={{
                                    backgroundColor: '#059669',
                                    padding: 15,
                                    borderRadius: 10,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 10,
                                    opacity: isLoading ? 0.6 : 1
                                  }}
                                >
                                  <AntDesign name="enviromento" size={20} color="#fff" />
                                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                                    {isLoading ? 'Getting Location...' : 'Get Current Location'}
                                  </Text>
                                </TouchableOpacity>
                              </View>


                                {/* office Timings */}
                              <View style={{  marginTop: 20 }}>
                                <Text style={{ color: '#8f9eb3', fontSize: 16, fontWeight: 'bold' }}>OFFICE TIMINGS</Text>
                                <View style={{ gap: 10, width: '100%', flexDirection: 'row', justifyContent: 'space-between',marginTop:10 }}>
                                  {/* Start Time */}
                                  <View style={{  gap: 10 }}>
                                    <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: 'bold' }}>Start Time</Text>
                                    <TouchableOpacity
                                      onPress={() => setShowStart(true)}
                                      style={{ borderWidth: 1, borderColor: '#334155', borderRadius: 10, padding: 15 }}
                                    >
                                      <Text style={{ color: formData.startTime ? '#fff' : '#8f9eb3' }}>
                                        {formData.startTime ? formatTime(formData.startTime) : 'Select Start Time'}
                                      </Text>
                                    </TouchableOpacity>
                                    {showStart && (
                                      <DateTimePicker
                                        value={formData.startTime || new Date()}
                                        mode="time"
                                        is24Hour={false}
                                        display="default"
                                        onChange={(e, t) => handleTimeChange(e, t, 'start')}
                                      />
                                    )}
                                  </View>

                                  {/* End Time */}
                                  <View style={{ gap: 10 }}>
                                    <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: 'bold' }}>End Time</Text>
                                    <TouchableOpacity
                                      onPress={() => setShowEnd(true)}
                                      style={{ borderWidth: 1, borderColor: '#334155', borderRadius: 10, padding: 15 }}
                                    >
                                      <Text style={{ color: formData.endTime ? '#fff' : '#8f9eb3' }}>
                                        {formData.endTime ? formatTime(formData.endTime) : 'Select End Time'}
                                      </Text>
                                    </TouchableOpacity>
                                    {showEnd && (
                                      <DateTimePicker
                                        value={formData.endTime || new Date()}
                                        mode="time"
                                        is24Hour={false}
                                        display="default"
                                        onChange={(e, t) => handleTimeChange(e, t, 'end')}
                                      />
                                    )}
                                  </View>
                                </View>
                              </View>

                              {/* Break Time */}
                              <View style={{ gap: 10, marginTop: 20 }}>
                                <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: 'bold' }}>Break Time</Text>
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                  {/* Hours */}
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ color: '#8f9eb3', fontSize: 14 }}>Hours</Text>
                                    <TextInput
                                      keyboardType="numeric"
                                      maxLength={2}
                                      value={getBreakHours().toString()}
                                      onChangeText={(val) => updateBreakTime(Number(val) || 0, getBreakMinutes())}
                                      style={{
                                        borderWidth: 1,
                                        borderColor: '#334155',
                                        borderRadius: 10,
                                        padding: 15,
                                        color: '#fff',
                                        textAlign: 'center'
                                      }}
                                      placeholder="0"
                                      placeholderTextColor="#8f9eb3"
                                    />
                                  </View>

                                  {/* Minutes */}
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ color: '#8f9eb3', fontSize: 14 }}>Minutes</Text>
                                    <TextInput
                                      keyboardType="numeric"
                                      maxLength={2}
                                      value={getBreakMinutes().toString()}
                                      onChangeText={(val) => updateBreakTime(getBreakHours(), Number(val) || 0)}
                                      style={{
                                        borderWidth: 1,
                                        borderColor: '#334155',
                                        borderRadius: 10,
                                        padding: 15,
                                        color: '#fff',
                                        textAlign: 'center'
                                      }}
                                      placeholder="0"
                                      placeholderTextColor="#8f9eb3"
                                    />
                                  </View>
                                </View>

                                <Text style={{ color: '#8f9eb3' }}>
                                  Break in minutes: {formData.breakTime} mins
                                </Text>
                              </View>


                                {/* Checkin Range */}
                              <View style={{ gap: 8, marginBottom: 10, marginTop: 10 }}>
                                <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: 'bold' }}>Check-In/Check-Out Allowed Radius</Text>
                                <Text style={{ color: '#8f9eb3', fontSize: 13 }}>Maximum allowed GPS distance from office for check-in/out.</Text>
                                <TextInput
                                  value={formData.range}
                                  keyboardType='number-pad'
                                  onChangeText={(text) => updateFormData('range', text)}
                                  placeholder="e.g. 500 (meters)"
                                  placeholderTextColor="#8f9eb3"
                                  style={{
                                    borderWidth: 1,
                                    borderColor: '#334155',
                                    borderRadius: 10,
                                    padding: 15,
                                    color: '#fff'
                                  }}
                                />
                              </View>

                              {/* Auto Finalize Attendance */}
                              <View style={{ gap: 8, marginBottom: 15, marginTop: 5 }}>
                                <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: 'bold' }}>Auto Finalize Attendance</Text>
                                <Text style={{ color: '#8f9eb3', fontSize: 13 }}>
                                  Clocks out forgotten check-outs and marks absentees. If not set, defaults to Shift End + 3h.
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                  <TouchableOpacity
                                    onPress={() => setShowAutoFinalize(true)}
                                    style={{
                                      flex: 1,
                                      borderWidth: 1,
                                      borderColor: '#334155',
                                      borderRadius: 10,
                                      padding: 15,
                                      backgroundColor: '#1e293b'
                                    }}
                                  >
                                    <Text style={{ color: formData.autoFinalizeTime ? '#38bdf8' : '#8f9eb3', fontWeight: formData.autoFinalizeTime ? 'bold' : 'normal' }}>
                                      {formData.autoFinalizeTime ? formatTime(formData.autoFinalizeTime) : 'Default (Shift End + 3h)'}
                                    </Text>
                                  </TouchableOpacity>
                                  {formData.autoFinalizeTime && (
                                    <TouchableOpacity
                                      onPress={() => updateFormData('autoFinalizeTime', null)}
                                      style={{
                                        backgroundColor: '#334155',
                                        paddingHorizontal: 16,
                                        paddingVertical: 15,
                                        borderRadius: 10
                                      }}
                                    >
                                      <Text style={{ color: '#f87171', fontSize: 13, fontWeight: 'bold' }}>Clear</Text>
                                    </TouchableOpacity>
                                  )}
                                </View>
                                {showAutoFinalize && (
                                  <DateTimePicker
                                    value={formData.autoFinalizeTime || formData.endTime || new Date()}
                                    mode="time"
                                    is24Hour={false}
                                    display="default"
                                    onChange={(e, t) => handleTimeChange(e, t, 'autoFinalize')}
                                  />
                                )}
                              </View>



                               <View style={styles.modalActions}>
                                              <TouchableOpacity 
                                                style={styles.cancelButton} 
                                                onPress={() => 
                                                  {
                                                    setModalVisible(false)
                                                  resetFormData()
                                                  }
                                                  }
                                              >
                                                <Text style={styles.cancelButtonText}>Cancel</Text>
                                              </TouchableOpacity>
                                              <TouchableOpacity style={[
                                                styles.saveButton,
                                                { opacity: isLoading ? 0.6 : 1}
                                              ]}
                                              disabled={isLoading}
                                               onPress={()=>{
                                                if(actionType === 'add'){
                                                  console.log('Adding office:');
                                                  addOffice();
                                                } else if(actionType === 'edit'){
                                                  updateOfficeSettings()
                                                }
                                              }}
                                              >
                                                <Text style={styles.saveButtonText}>
                                                  {actionType === 'edit' ? 'Update' : 'Add'} Office
                                                </Text>
                                              </TouchableOpacity>
                                  </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      </ScrollView>
     </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  
     </SafeAreaView>
  )
}

export default OfficeSettings

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111a22',
  },
  header: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
  },
  generalSettingsContainer: {
    padding: 10,
    gap: 10,
  },
  tabContainer: {
    width: '100%',
  },
  tab: {
    width: '100%',
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#192633',
    borderRadius: 12,
  },
  modalScrollContent: {
    padding: 20,
    flexGrow: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A3441',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#8A9BAE',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
})