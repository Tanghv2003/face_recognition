import React, { Component } from 'react';
import * as faceapi from 'face-api.js';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

class FacialRecognition extends Component {
  constructor(props) {
    super(props);
    this.state = {
      videoUrl: null,
      matchFound: null,
      matchedUser: null,
      users: [], // Mảng lưu trữ các LabeledFaceDescriptors đã được thêm
      loading: false,
      userName: '', // Lưu tên người dùng
    };
    this.videoRef = React.createRef(); // Ref để trỏ đến video element
    this.canvasRef = React.createRef(); // Ref để trỏ đến canvas
    this.imageInputRef = React.createRef(); // Ref để trỏ đến input ảnh
  }

  async componentDidMount() {
    await this.loadModels();
    this.loadUsersFromLocalStorage();
    this.startVideo();
  }

  loadModels = async () => {
    try {
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
      await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      await faceapi.nets.mtcnn.loadFromUri('/models');
    } catch (e) {
      console.log(e);
    }
  };

  loadUsersFromLocalStorage = () => {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const formattedUsers = users.map(user => {
      if (user.label && Array.isArray(user.descriptors)) {
        const descriptors = user.descriptors.map(descriptor => new Float32Array(descriptor));
        return new faceapi.LabeledFaceDescriptors(user.label, descriptors);
      }
      return null;
    }).filter(user => user !== null);

    this.setState({ users: formattedUsers });
  };

  startVideo = () => {
    navigator.mediaDevices.getUserMedia({ video: {} })
      .then((stream) => {
        this.videoRef.current.srcObject = stream;
      })
      .catch((err) => {
        console.log('Error accessing webcam: ', err);
      });
  };

  handleNameChange = (event) => {
    this.setState({ userName: event.target.value });
  };

  addNewUser = async () => {
  if (!this.state.userName) {
    alert('Vui lòng nhập tên người dùng.');
    return;
  }

  this.setState({ loading: true });
  const video = this.videoRef.current;
  const canvas = this.canvasRef.current;

  // Nhận diện khuôn mặt từ video
  const detections = await faceapi.detectAllFaces(video).withFaceLandmarks().withFaceDescriptors();

  if (detections.length > 0) {
    // Lấy descriptor của khuôn mặt
    const descriptors = detections.map(d => new Float32Array(d.descriptor));

    // Tạo LabeledFaceDescriptors mới
    const labeledFaceDescriptors = new faceapi.LabeledFaceDescriptors(this.state.userName, descriptors);
    
    // Cập nhật lại mảng users
    const users = [...this.state.users, labeledFaceDescriptors];

    // Lưu vào localStorage
    const userData = users.map(user => ({
      label: user._label,
      descriptors: user._descriptors.map(descriptor => Array.from(descriptor)) // Chuyển Float32Array thành mảng thông thường
    }));
    localStorage.setItem('users', JSON.stringify(userData));

    // Cập nhật lại state
    this.setState({ users, matchFound: null, loading: false, userName: '' });
    faceapi.draw.drawDetections(canvas, detections);
    faceapi.draw.drawFaceLandmarks(canvas, detections);
  } else {
    this.setState({ loading: false });
    alert('No face detected, please try again.');
  }
};


  checkMatchFromImage = async () => {
    this.setState({ loading: true });
    const input = this.imageInputRef.current.files[0];

    if (!input) {
      alert("Vui lòng chọn một ảnh.");
      this.setState({ loading: false });
      return;
    }

    const image = await faceapi.bufferToImage(input);
    const detections = await faceapi.detectAllFaces(image).withFaceLandmarks().withFaceDescriptors();

    if (detections.length > 0) {
      const labeledFaceDescriptors = this.state.users.map(user => {
        return new faceapi.LabeledFaceDescriptors(user.label, user.descriptors.map(descriptor => new Float32Array(descriptor)));
      });

      const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);
      const results = detections.map(d => faceMatcher.findBestMatch(d.descriptor));
      const match = results.find(result => result.label !== 'unknown');

      if (match) {
        this.setState({
          matchFound: 'Match Found!',
          matchedUser: match.label,
          loading: false,
        });
      } else {
        this.setState({
          matchFound: 'No match found!',
          matchedUser: null,
          loading: false,
        });
      }
    } else {
      this.setState({ loading: false });
      alert('No face detected in the image, please try again.');
    }
  };

  // Hàm xóa user khỏi danh sách
  deleteUser = (label) => {
    const updatedUsers = this.state.users.filter(user => user._label !== label);

    // Cập nhật lại localStorage
    const userData = updatedUsers.map(user => ({
      label: user._label,
      descriptors: user._descriptors.map(descriptor => Array.from(descriptor))
    }));
    localStorage.setItem('users', JSON.stringify(userData));

    // Cập nhật lại state
    this.setState({ users: updatedUsers });
  };

  render() {
    return (
      <div>
        <h1>Facial Recognition</h1>

        <div>
          <video
            ref={this.videoRef}
            autoPlay
            width="640"
            height="480"
            style={{ border: '1px solid black' }}
          />
          <canvas ref={this.canvasRef} width="640" height="480" style={{ position: 'absolute', top: 0, left: 0 }} />
        </div>

        <TextField
          label="Enter User Name"
          variant="outlined"
          value={this.state.userName}
          onChange={this.handleNameChange}
          style={{ marginTop: '20px', width: '200px' }}
        />

        <Button
          variant="contained"
          color="primary"
          onClick={this.addNewUser}
          disabled={this.state.loading}
          style={{ marginTop: '20px' }}
        >
          Add User from Webcam
        </Button>

        <Button
          variant="contained"
          color="secondary"
          onClick={this.checkMatchFromImage}
          disabled={this.state.loading || this.state.users.length === 0}
          style={{ marginTop: '20px' }}
        >
          Check for Match from Image
        </Button>

        <input
          type="file"
          accept="image/*"
          ref={this.imageInputRef}
          style={{ marginTop: '20px' }}
        />

        {this.state.matchFound && <p>{this.state.matchFound}</p>}
        {this.state.matchedUser && <p>Matched User: {this.state.matchedUser}</p>}
        {this.state.loading && <p>Loading...</p>}

        <h2>Users List:</h2>
        <ul>
          {this.state.users.map((user, index) => (
            <li key={index}>
              {user._label}
              <Button
                variant="outlined"
                color="error"
                onClick={() => this.deleteUser(user._label)} // Xóa user khi nhấn nút
                style={{ marginLeft: '10px' }}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      </div>
    );
  }
}

export default FacialRecognition;
