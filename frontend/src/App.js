
import React from 'react';

import FacialRecognition from './face_components';

class App extends React.Component{

  state = {

  }

  render(){
    return(
      <div className="app">
        <p>Upload a portait image to the first box and an image of your choice to the second box and see if the first face exists in the second picture.</p>
        <FacialRecognition />
      </div>
    )
  }
}

export default App;
