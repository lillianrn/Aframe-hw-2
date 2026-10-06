AFRAME.registerComponent('navigation', {
  init: function() {
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.rotateLeft = false;
    this.rotateRight = false;
    this.rotateUp = false;
    this.rotateDown = false;
    this.startX = 0;
    this.startY = 0;
    let rightController = document.getElementById("right-hand");
    let leftController = document.getElementById("left-hand");
    this.rig = this.el;
    this.camera = document.getElementById("camera");
    this.frontIntersect = false;
    this.backIntersect = false;
    this.raycasters = document.querySelector("#raycasters");
    this.touchTurnStrength = 1; // 1 = full speed, used only by touch

    window.addEventListener("keydown", (event) => {
      if (event.key === "ArrowUp" || event.key === "w") {
        this.moveForward = true;
      } 
      if (event.key === "ArrowDown" || event.key === "s") {
        this.moveBackward = true;
      }
      if (event.key === "ArrowLeft" || event.key === "a") {
        this.rotateLeft = true;
      } 
      if (event.key === "ArrowRight" || event.key === "d") {
        this.rotateRight = true;
      }
      if (event.key === "q") {
        this.rotateUp = true;
      }
      if (event.key === "e") {
        this.rotateDown = true;
      }
    });

    window.addEventListener("keyup", (event) => {
      if (event.key === "ArrowUp" || event.key === "w") {
        this.moveForward = false;
      } 
      if (event.key === "ArrowDown" || event.key === "s") {
        this.moveBackward = false;
      }
      if (event.key === "ArrowLeft" || event.key === "a") {
        this.rotateLeft = false;
      } 
      if (event.key === "ArrowRight" || event.key === "d") {
        this.rotateRight = false;
      }
      if (event.key === "q") {
        this.rotateUp = false;
      }
      if (event.key === "e") {
        this.rotateDown = false;
      }
    });

    window.addEventListener("touchstart", (event) => {
      this.startX = event.touches[0].screenX;
      this.startY = event.touches[0].screenY;
    });

    window.addEventListener("touchmove", (event) => {
      const deltaX = event.touches[0].screenX - this.startX;
      const deltaY = event.touches[0].screenY - this.startY;

      const threshold = 20;
      const maxRange = 120; // distance (px) at which turning reaches full speed

      // Vertical axis — independent of horizontal, still boolean on/off
      if (Math.abs(deltaY) > threshold) {
        if (deltaY < 0) {
          if (event.touches.length === 1) {
            this.moveForward = true;
            this.moveBackward = false;
          }
          if (event.touches.length === 2) {
            this.rotateUp = true;
            this.rotateDown = false;
          }
        } else {
          if (event.touches.length === 1) {
            this.moveBackward = true;
            this.moveForward = false;
          }
          if (event.touches.length === 2) {
            this.rotateDown = true;
            this.rotateUp = false;
          }
        }
      } else {
        this.moveForward = false;
        this.moveBackward = false;
        this.rotateUp = false;
        this.rotateDown = false;
      }

      // Horizontal axis — booleans still control direction,
      // but strength ramps smoothly from 0 to 1 based on drag distance
      if (Math.abs(deltaX) > threshold) {
        const magnitude = Math.min((Math.abs(deltaX) - threshold) / (maxRange - threshold), 1);
        this.touchTurnStrength = magnitude;

        if (deltaX < 0) {
          this.rotateLeft = true;
          this.rotateRight = false;
        } else {
          this.rotateRight = true;
          this.rotateLeft = false;
        }
      } else {
        this.rotateLeft = false;
        this.rotateRight = false;
        this.touchTurnStrength = 1;
      }
    });

    window.addEventListener("touchend", (event) => {
      this.moveForward = false;
      this.moveBackward = false;
      this.rotateLeft = false;
      this.rotateRight = false;
      this.rotateUp = false;
      this.rotateDown = false;
      this.touchTurnStrength = 1;
    });

    leftController.addEventListener("thumbstickmoved", (event) => {
      if (event.detail.y < -0.7) {
        this.moveForward = true;
        this.moveBackward = false;
      }
      else if (event.detail.y > 0.7) {
        this.moveBackward = true;
        this.moveForward = false;
      }
      else {
        this.moveForward = false;
        this.moveBackward = false;
      }
    });

    rightController.addEventListener("thumbstickmoved", (event) => {
      if (event.detail.x < -0.7) {
         this.rotateLeft = true;
         this.rotateRight = false;
      }
      else if (event.detail.x > 0.7) {
        this.rotateRight = true;
        this.rotateLeft = false;
      }
      else {
        this.rotateRight = false;
        this.rotateLeft = false;
      }
    });

    this.raycasters.addEventListener("raycaster-intersection", (event) => {
      if (event.target.id === "waist-raycaster-front" || 
          event.target.id === "head-raycaster-front"  ||
          event.target.id === "knees-raycaster-front") {
        this.frontIntersect = true;
      }
      else if (event.target.id === "waist-raycaster-back" || 
               event.target.id === "head-raycaster-back"  ||
               event.target.id === "knees-raycaster-back") {
        this.backIntersect = true;
      }
    });
    
    this.raycasters.addEventListener("raycaster-intersection-cleared", (event) => {
      if (event.target.id === "waist-raycaster-front" || 
          event.target.id === "head-raycaster-front"  ||
          event.target.id === "knees-raycaster-front") {
        this.frontIntersect = false;
      }
      else if (event.target.id === "waist-raycaster-back" || 
               event.target.id === "head-raycaster-back"  ||
               event.target.id === "knees-raycaster-back") {
        this.backIntersect = false;
      }
    });
  },
  
  tick: function(time, timeDelta) {
    let direction = new THREE.Vector3();
    this.rig.object3D.getWorldDirection(direction);
    let speed = 0.003 * timeDelta;
    let intersectionHeight = 0;
    let feetRaycaster = document.getElementById("feet-raycaster");
    let raycasterComponent = feetRaycaster.components.raycaster; 

    // After getting the rig’s forward direction, adjust it by where the camera is looking.
    direction.applyQuaternion(this.camera.object3D.quaternion);
    
    // match camera position so rotation happens around head
    const pos = this.rig.object3D.getWorldPosition(new THREE.Vector3());
    this.raycasters.object3D.position.copy(pos);
    // apply ONLY yaw
    const worldQuat = new THREE.Quaternion();
    this.camera.object3D.getWorldQuaternion(worldQuat);
    const euler = new THREE.Euler();
    euler.setFromQuaternion(worldQuat, 'YXZ');
    this.raycasters.object3D.rotation.set(0, euler.y, 0);
    
    if (raycasterComponent.intersections.length > 0) {
      intersectionHeight = raycasterComponent.intersections[0].point.y;
    }
    
    let heightDelta = intersectionHeight - this.rig.object3D.position.y;
    if (heightDelta > 0.1) {
      this.rig.object3D.position.y += speed;
    }
    else if (heightDelta < -0.1) {
      this.rig.object3D.position.y -= speed;
    }
    else {
      this.rig.object3D.position.y = intersectionHeight;
    }
    
    if (this.moveForward === true && this.frontIntersect === false) {
      this.rig.object3D.position.sub(direction.multiplyScalar(speed));
    }
    if (this.moveBackward === true && this.backIntersect === false) {
      this.rig.object3D.position.add(direction.multiplyScalar(speed)); 
    }

    if (this.rotateLeft === true) {
      this.rig.object3D.rotation.y += speed * this.touchTurnStrength;;
    }
    if (this.rotateRight === true) {
      this.rig.object3D.rotation.y -= speed * this.touchTurnStrength;;
    }

    if (this.rotateUp === true) {
      if (this.camera.object3D.rotation.x <= THREE.MathUtils.degToRad(60)) {
        this.camera.object3D.rotation.x += speed;
      }
    }
    if (this.rotateDown === true) {
      if (this.camera.object3D.rotation.x >= THREE.MathUtils.degToRad(-60)) {
        this.camera.object3D.rotation.x -= speed;
      }
    }
  }
});

