# Adds PrivacyInfo.xcprivacy to the App target's resources (Apple requires it).
require 'xcodeproj'
project = Xcodeproj::Project.open('ios/App/App.xcodeproj')
target = project.targets.find { |t| t.name == 'App' }
group = project.main_group.find_subpath('App', false)
unless group.files.any? { |f| f.path == 'PrivacyInfo.xcprivacy' }
  ref = group.new_reference('PrivacyInfo.xcprivacy')
  target.resources_build_phase.add_file_reference(ref)
end
project.save
puts 'PrivacyInfo.xcprivacy added'
