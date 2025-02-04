# for this moment Ubuntu 24.04 doesn't support playwright so you must install this dependencies manually

# First: download dependencies
# libicu70
wget https://launchpad.net/ubuntu/+source/icu/70.1-2/+build/23145450/+files/libicu70_70.1-2_amd64.deb
mv libicu70_70.1-2_amd64.deb libicu70.deb

# libvpx
wget http://archive.ubuntu.com/ubuntu/pool/main/libv/libvpx/libvpx7_1.11.0-2ubuntu2.3_amd64.deb
mv libvpx7_1.11.0-2ubuntu2.3_amd64.deb libvpx7.deb

# Second: install dependencies
sudo apt install ./libicu70.deb ./libvpx7.deb

# Third: remove dependencies
rm libicu70.deb libvpx7.deb
