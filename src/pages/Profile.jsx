
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import api from "../services/authService";
import { useAuth } from "../context/AuthContext";

/*
=========================================================
DATE HELPERS
=========================================================
*/

function parseBackendUtc(value) {
  if (!value) return null;

  const text = String(value).trim();

  if (!text) return null;

  if (
    text.endsWith("Z") ||
    /[+-]\d{2}:\d{2}$/.test(text)
  ) {
    const date = new Date(text);

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  const date = new Date(`${text}Z`);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function formatActivityDate(value) {
  const date = parseBackendUtc(value);

  if (!date) {
    return "No activity recorded";
  }

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/*
=========================================================
ERROR HELPER
=========================================================
*/

function getErrorMessage(error, fallback) {
  const data = error?.response?.data;

  if (!data) {
    return fallback;
  }

  // Normal API message
  if (typeof data.message === "string") {
    return data.message;
  }

  // ASP.NET validation error
  if (data.errors) {
    const errors = data.errors;

    if (typeof errors === "object") {
      const messages = Object.values(errors)
        .flat()
        .filter(Boolean);

      if (messages.length > 0) {
        return messages.join(" ");
      }
    }
  }

  // ASP.NET ProblemDetails
  if (typeof data.detail === "string") {
    return data.detail;
  }

  if (typeof data.title === "string") {
    return data.title;
  }

  if (typeof data === "string") {
    return data;
  }

  return fallback;
}

/*
=========================================================
PROFILE
=========================================================
*/

export default function Profile() {
  const { user, updateUser } = useAuth();

  const [profile, setProfile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editing, setEditing] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);

  /*
  ========================================================
  AVATAR OPTIONS
  ========================================================
  */

  const avatarOptions = [
    {
      id: "male",
      name: "Male",
      image:
        "https://tse4.mm.bing.net/th/id/OIP.FdYBeA-pveP94ioeZvPAvwHaHa?r=0&rs=1&pid=ImgDetMain&o=7&rm=3",
    },
    {
      id: "female",
      name: "Female",
      image:
        "https://img.freepik.com/premium-vector/woman-cartoon-character-expression-showing-vector-illustration_1142458-1961.jpg?w=2000",
    },
  ];

  /*
  ========================================================
  FORM
  ========================================================
  */

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    department: "",
  });

  /*
  ========================================================
  LOAD PROFILE
  ========================================================
  */

  async function loadProfile() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/user/me");

      const data = response.data;

      setProfile(data);

      setForm({
        fullName: data.fullName || "",
        email: data.email || "",
        department: data.department || "",
      });
    } catch (err) {
      console.error("Load profile error:", err);

      setError(
        getErrorMessage(
          err,
          "Couldn't load your profile."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  /*
  ========================================================
  FORM CHANGE
  ========================================================
  */

  function handleChange(e) {
    setForm((current) => ({
      ...current,
      [e.target.name]: e.target.value,
    }));
  }

  /*
  ========================================================
  CANCEL EDIT
  ========================================================
  */

  function handleCancel() {
    setEditing(false);

    setForm({
      fullName: profile?.fullName || "",
      email: profile?.email || "",
      department: profile?.department || "",
    });

    setError("");
    setSuccess("");
  }

  /*
  ========================================================
  SAVE PROFILE
  ========================================================
  */

  async function handleSave() {
    if (saving) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (!form.fullName.trim()) {
        setError("Full name is required.");
        return;
      }

      if (!form.email.trim()) {
        setError("Email is required.");
        return;
      }

      const response = await api.put("/user/me", {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        department: form.department.trim(),
      });

      const updatedProfile = response.data;

      setProfile((current) => ({
        ...current,
        ...updatedProfile,
      }));

      setForm({
        fullName: updatedProfile.fullName || "",
        email: updatedProfile.email || "",
        department: updatedProfile.department || "",
      });

      if (updateUser) {
        updateUser({
          ...user,
          fullName: updatedProfile.fullName,
          email: updatedProfile.email,
          department: updatedProfile.department,
          userId: updatedProfile.userId,
          role: updatedProfile.roleName,
          profileImageUrl:
            updatedProfile.profileImageUrl ||
            profile?.profileImageUrl ||
            user?.profileImageUrl,
        });
      }

      setEditing(false);

      setSuccess(
        "Your profile has been updated successfully."
      );

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      console.error("Update profile error:", err);

      setError(
        getErrorMessage(
          err,
          "Couldn't update your profile."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  /*
  ========================================================
  SAVE PROFILE PHOTO
  ========================================================
  */

  async function saveProfilePhoto(imageUrl) {
    if (!imageUrl || savingPhoto) {
      return;
    }

    try {
      setSavingPhoto(true);
      setError("");
      setSuccess("");

      /*
      IMPORTANT:
      The backend expects:

      {
        profileImageUrl: "..."
      }
      */

      const response = await api.put(
        "/user/me/photo",
        {
          profileImageUrl: imageUrl,
        }
      );

      const updatedProfile = response.data;

      const newImage =
        updatedProfile.profileImageUrl ||
        imageUrl;

      /*
      Update local profile
      */

      setProfile((current) => ({
        ...current,
        ...updatedProfile,
        profileImageUrl: newImage,
      }));

      /*
      Update AuthContext
      */

      if (updateUser) {
        updateUser({
          ...user,
          profileImageUrl: newImage,
        });
      }

      /*
      Close menu
      */

      setShowAvatarMenu(false);

      /*
      Success message
      */

      setSuccess(
        "Profile picture updated successfully."
      );

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      console.error(
        "Save profile photo error:",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Couldn't save your profile picture."
        )
      );
    } finally {
      setSavingPhoto(false);
    }
  }

  /*
  ========================================================
  SELECT AVATAR
  ========================================================
  */

  function handleAvatarSelect(avatar) {
    if (savingPhoto) {
      return;
    }

    saveProfilePhoto(avatar.image);
  }

  /*
  ========================================================
  UPLOAD PHOTO
  ========================================================
  */

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    /*
    Check file type
    */

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      e.target.value = "";
      return;
    }

    /*
    Optional size limit: 5 MB
    */

    if (file.size > 5 * 1024 * 1024) {
      setError(
        "The selected image must be smaller than 5 MB."
      );

      e.target.value = "";
      return;
    }

    try {
      setSavingPhoto(true);
      setError("");
      setSuccess("");

      const reader = new FileReader();

      reader.onload = async () => {
        try {
          const imageUrl = reader.result;

          if (
            typeof imageUrl !== "string" ||
            !imageUrl.startsWith("data:image/")
          ) {
            throw new Error(
              "Invalid image data."
            );
          }

          /*
          Send Base64 image to backend
          */

          const response = await api.put(
            "/user/me/photo",
            {
              profileImageUrl: imageUrl,
            }
          );

          const updatedProfile = response.data;

          const newImage =
            updatedProfile.profileImageUrl ||
            imageUrl;

          /*
          Update profile
          */

          setProfile((current) => ({
            ...current,
            ...updatedProfile,
            profileImageUrl: newImage,
          }));

          /*
          Update AuthContext
          */

          if (updateUser) {
            updateUser({
              ...user,
              profileImageUrl: newImage,
            });
          }

          /*
          Close avatar menu
          */

          setShowAvatarMenu(false);

          /*
          Success
          */

          setSuccess(
            "Profile picture updated successfully."
          );

          setTimeout(() => {
            setSuccess("");
          }, 3000);
        } catch (err) {
          console.error(
            "Upload profile photo error:",
            err
          );

          setError(
            getErrorMessage(
              err,
              "Couldn't save your profile picture."
            )
          );
        } finally {
          setSavingPhoto(false);
        }
      };

      reader.onerror = () => {
        setSavingPhoto(false);
        setError(
          "Couldn't read the selected image."
        );
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);

      setSavingPhoto(false);

      setError(
        getErrorMessage(
          err,
          "Couldn't upload the selected image."
        )
      );
    }

    /*
    Allow selecting same file again
    */

    e.target.value = "";
  }

  /*
  ========================================================
  LOADING
  ========================================================
  */

  if (loading) {
    return (
      <AppLayout>
        <div className="profile-loading">
          <div className="profile-spinner"></div>
          <p>Loading your profile...</p>
        </div>
      </AppLayout>
    );
  }

  /*
  ========================================================
  ERROR
  ========================================================
  */

  if (error && !profile) {
    return (
      <AppLayout>
        <div className="profile-page">

          <Link
            to="/dashboard"
            className="profile-back-link"
          >
            ← Back to Dashboard
          </Link>

          <div className="profile-error">
            <strong>
              Unable to load profile
            </strong>

            <p>{error}</p>
          </div>

        </div>
      </AppLayout>
    );
  }

  /*
  ========================================================
  AVATAR FALLBACK
  ========================================================
  */

  const firstLetter =
    profile?.fullName
      ?.charAt(0)
      ?.toUpperCase() || "U";

  /*
  ========================================================
  PAGE
  ========================================================
  */

  return (
    <AppLayout>

      <div className="profile-page">

        {/* BACK */}

        <Link
          to="/dashboard"
          className="profile-back-link"
        >
          ← Back to Dashboard
        </Link>

        {/* HEADER */}

        <div className="profile-page-header">

          <div>
            <h1>My Profile</h1>

            <p>
              Manage your personal information
              and account details.
            </p>
          </div>

        </div>

        {/* SUCCESS */}

        {success && (
          <div className="profile-success">
            <span>✓</span>
            {success}
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div className="profile-error">

            <span>⚠</span>

            <div>
              <strong>
                Something went wrong
              </strong>

              <p>{error}</p>
            </div>

          </div>
        )}

        {/* =================================================
            PROFILE HERO
        ================================================= */}

        <div className="profile-hero-card">

          <div className="profile-hero-left">

            <div className="profile-avatar-wrapper">

              {/* CURRENT AVATAR */}

              {profile?.profileImageUrl ? (

                <img
                  src={profile.profileImageUrl}
                  alt="Profile"
                  className="profile-avatar-image"
                />

              ) : (

                <div className="profile-avatar">
                  {firstLetter}
                </div>

              )}

              {/* CAMERA BUTTON */}

              <button
                type="button"
                className="profile-photo-button"
                title="Change profile photo"
                disabled={savingPhoto}
                onClick={() =>
                  setShowAvatarMenu(
                    (current) => !current
                  )
                }
              >
                {savingPhoto ? "⏳" : "📷"}
              </button>

              {/* =================================================
                  AVATAR MENU
              ================================================= */}

              {showAvatarMenu && (

                <div className="avatar-menu">

                  <div className="avatar-menu-title">
                    Choose Profile Picture
                  </div>

                  <div className="avatar-options">

                    {avatarOptions.map(
                      (avatar) => (

                        <button
                          key={avatar.id}
                          type="button"
                          className="avatar-option"
                          disabled={savingPhoto}
                          onClick={() =>
                            handleAvatarSelect(
                              avatar
                            )
                          }
                        >

                          <img
                            src={avatar.image}
                            alt={avatar.name}
                            className="avatar-option-image"
                          />

                          <span>
                            {avatar.name}
                          </span>

                        </button>

                      )
                    )}

                  </div>

                  {/* UPLOAD */}

                  <label
                    className={`avatar-upload-option ${
                      savingPhoto
                        ? "disabled"
                        : ""
                    }`}
                  >

                    📁 Upload from file

                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      disabled={savingPhoto}
                      onChange={
                        handlePhotoUpload
                      }
                    />

                  </label>

                </div>

              )}

            </div>

            {/* HERO INFORMATION */}

            <div className="profile-hero-info">

              <h2>
                {profile?.fullName}
              </h2>

              <span className="profile-role-badge">
                {profile?.roleName || "User"}
              </span>

              <p>
                {profile?.email}
              </p>

            </div>

          </div>

          <div className="profile-hero-right">

            <div className="profile-status">

              <span className="status-circle"></span>

              {profile?.isActive !== false
                ? "Active"
                : "Inactive"}

            </div>

          </div>

        </div>

        {/* =================================================
            PERSONAL INFORMATION
        ================================================= */}

        <div className="profile-card">

          <div className="profile-card-header">

            <div className="profile-card-title">

              <div className="profile-card-icon">
                👤
              </div>

              <div>

                <h2>
                  Personal Information
                </h2>

                <p>
                  Your basic personal information.
                </p>

              </div>

            </div>

            {!editing && (

              <button
                className="profile-edit-button"
                onClick={() => {
                  setEditing(true);
                  setError("");
                  setSuccess("");
                }}
              >
                ✎ Edit Profile
              </button>

            )}

          </div>

          <div className="profile-card-body">

            <div className="profile-fields-grid">

              {/* FULL NAME */}

              <div className="profile-field">

                <label>
                  Full Name
                </label>

                {editing ? (

                  <input
                    type="text"
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                  />

                ) : (

                  <div className="profile-field-value">
                    {profile?.fullName || "-"}
                  </div>

                )}

              </div>

              {/* EMAIL */}

              <div className="profile-field">

                <label>
                  Email Address
                </label>

                {editing ? (

                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                  />

                ) : (

                  <div className="profile-field-value">
                    {profile?.email || "-"}
                  </div>

                )}

              </div>

              {/* USER ID */}

              <div className="profile-field">

                <label>
                  User ID
                </label>

                <div className="profile-field-value readonly">
                  {profile?.userId || "-"}
                </div>

              </div>

              {/* DEPARTMENT */}

              <div className="profile-field">

                <label>
                  Department
                </label>

                {editing ? (

                  <input
                    type="text"
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                    placeholder="Enter your department"
                  />

                ) : (

                  <div className="profile-field-value">
                    {profile?.department || "-"}
                  </div>

                )}

              </div>

              {/* ROLE */}

              <div className="profile-field">

                <label>
                  Role
                </label>

                <div className="profile-field-value readonly">
                  {profile?.roleName || "-"}
                </div>

              </div>

              {/* CREATED DATE */}

              <div className="profile-field">

                <label>
                  Created Date
                </label>

                <div className="profile-field-value readonly">

                  {profile?.createdDate
                    ? parseBackendUtc(
                        profile.createdDate
                      )?.toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )
                    : "-"}

                </div>

              </div>

            </div>

            {/* EDIT ACTIONS */}

            {editing && (

              <div className="profile-form-actions">

                <button
                  className="profile-cancel-button"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  className="profile-save-button"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : "Save Changes"}
                </button>

              </div>

            )}

          </div>

        </div>

        {/* =================================================
            RECENT ACTIVITY
        ================================================= */}

        <div className="profile-card">

          <div className="profile-card-header">

            <div className="profile-card-title">

              <div className="profile-card-icon">
                🕒
              </div>

              <div>

                <h2>
                  Recent Activity
                </h2>

                <p>
                  View your latest account activities.
                </p>

              </div>

            </div>

          </div>

          <div className="profile-card-body">

            <div className="profile-activity-list">

              {/* LAST LOGIN */}

              <div className="profile-activity-item">

                <div className="profile-activity-icon">
                  🟢
                </div>

                <div className="profile-activity-content">

                  <strong>
                    Last Login
                  </strong>

                  <span>
                    {formatActivityDate(
                      profile?.lastLoginDate
                    )}
                  </span>

                </div>

              </div>

              {/* PASSWORD */}

              <div className="profile-activity-item">

                <div className="profile-activity-icon">
                  🔒
                </div>

                <div className="profile-activity-content">

                  <strong>
                    Password Changed
                  </strong>

                  <span>
                    {formatActivityDate(
                      profile?.passwordChangedDate
                    )}
                  </span>

                </div>

              </div>

              {/* PROFILE UPDATED */}

              <div className="profile-activity-item">

                <div className="profile-activity-icon">
                  ✏️
                </div>

                <div className="profile-activity-content">

                  <strong>
                    Profile Updated
                  </strong>

                  <span>
                    {formatActivityDate(
                      profile?.profileUpdatedDate
                    )}
                  </span>

                </div>

              </div>

            </div>

          </div>

        </div>

        {/* =================================================
            SECURITY
        ================================================= */}

        <div className="profile-card">

          <div className="profile-card-header">

            <div className="profile-card-title">

              <div className="profile-card-icon">
                🔒
              </div>

              <div>

                <h2>
                  Security
                </h2>

                <p>
                  Keep your account secure.
                </p>

              </div>

            </div>

          </div>

          <div className="profile-security-row">

            <div>

              <h3>
                Password
              </h3>

              <p>
                Change your password regularly
                to keep your account secure.
              </p>

            </div>

            <Link
              to="/forgot-password"
              className="profile-security-button"
            >
              Change Password
            </Link>

          </div>

        </div>

      </div>

    </AppLayout>
  );
}